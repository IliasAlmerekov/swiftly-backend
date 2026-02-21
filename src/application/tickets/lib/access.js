export const isSupportUser = user =>
  ["support1", "admin"].includes(user?.role ?? "");

export const isTicketOwner = (ticket, user) => {
  const ownerId = ticket?.owner?._id ? ticket.owner._id : ticket?.owner;
  if (!ownerId || !user?._id) {
    return false;
  }

  return user._id.toString() === ownerId.toString();
};
