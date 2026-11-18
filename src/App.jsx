import { Toaster } from "react-hot-toast";
import { AppRoutes } from "./routes/AppRoutes";

export default function App() {
  return (
    <>
      <AppRoutes />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3500,
          style: { borderRadius: "14px", background: "#202020", color: "#fff" },
        }}
      />
    </>
  );
}
