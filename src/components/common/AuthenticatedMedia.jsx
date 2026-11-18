import { useEffect, useRef, useState } from "react";
import api from "../../services/api";

export default function AuthenticatedMedia({ url, type = "image", alt = "Shared image", className = "" }) {
  const containerRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [source, setSource] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || !("IntersectionObserver" in window)) {
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "200px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !url) return undefined;
    const controller = new AbortController();
    let objectUrl = "";
    api.get(url, { responseType: "blob", signal: controller.signal })
      .then(({ data }) => {
        objectUrl = URL.createObjectURL(data);
        setSource(objectUrl);
      })
      .catch((requestError) => {
        if (requestError.name !== "CanceledError" && requestError.name !== "AbortError") setError(true);
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, visible]);

  return (
    <div ref={containerRef} className={className}>
      {source && type === "video" ? (
        <video src={source} controls preload="metadata" className="max-h-72 w-full min-w-[220px] rounded-xl bg-black" aria-label={alt} />
      ) : source ? (
        <img src={source} alt={alt} className="max-h-72 max-w-full rounded-xl object-cover" />
      ) : error ? (
        <div className="flex min-h-20 min-w-48 items-center justify-center rounded-xl bg-black/[0.05] px-4 text-xs text-muted">
          Could not load this attachment.
        </div>
      ) : (
        <div className={`skeleton ${type === "video" ? "h-40 w-64" : "h-40 w-64"} rounded-xl`} aria-label="Loading attachment" />
      )}
    </div>
  );
}
