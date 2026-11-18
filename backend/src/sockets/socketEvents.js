export const CLIENT_EVENTS = Object.freeze({
  JOIN_GROUP: "join_group",
  LEAVE_GROUP: "leave_group",
  SEND_MESSAGE: "send_message",
  TYPING_START: "typing_start",
  TYPING_STOP: "typing_stop",
  DELETE_MESSAGE: "delete_message",
});

export const SERVER_EVENTS = Object.freeze({
  NEW_MESSAGE: "new_message",
  MEMBER_JOINED: "member_joined",
  MEMBER_LEFT: "member_left",
  ONLINE_MEMBERS: "online_members",
  USER_TYPING: "user_typing",
  USER_STOPPED_TYPING: "user_stopped_typing",
  MESSAGE_DELETED: "message_deleted",
  MEMBER_REMOVED: "member_removed",
  GROUP_DELETED: "group_deleted",
});
