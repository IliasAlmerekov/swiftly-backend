import { decodeCursor, encodeCursor } from "../../../utils/cursor.js";
import { assertClockPort } from "../../ports/ClockPort.js";
import { assertTicketRepositoryPort } from "../../ports/TicketRepositoryPort.js";
import { isSupportUser } from "../lib/access.js";
import { forbiddenError } from "../lib/errors.js";

export const createListTicketsUseCase = ({ ticketRepository, clock }) => {
  const ticketRepositoryPort = assertTicketRepositoryPort(ticketRepository);
  const clockPort = assertClockPort(clock);

  return async ({ user, query = {} }) => {
    const isSupport = isSupportUser(user);
    const limit = query.limit ?? 50;
    const cursor = decodeCursor(query.cursor);
    const scope = query.scope ?? (isSupport ? "all" : "mine");

    if (!isSupport && scope !== "mine") {
      throw forbiddenError("Access denied");
    }

    if (scope === "assignedToMe" && !isSupport) {
      throw forbiddenError("Access denied");
    }

    const filters = [];
    if (scope === "mine") {
      filters.push({ owner: user._id });
    }

    if (scope === "assignedToMe") {
      const assignedFilters = [{ assignedTo: user._id }];
      if (query.includeUnassigned) {
        assignedFilters.push({ assignedTo: null });
      }
      filters.push({ $or: assignedFilters });
    }

    if (query.status && query.status.length > 0) {
      filters.push({ status: { $in: query.status } });
    }

    if (query.date === "today") {
      const { start, end } = getBerlinDayRange(clockPort.now());
      filters.push({ createdAt: { $gte: start, $lte: end } });
    }

    const filter =
      filters.length === 0
        ? {}
        : filters.length === 1
          ? filters[0]
          : { $and: filters };

    const tickets = await ticketRepositoryPort.findFilteredPopulated({
      filter,
      cursor,
      limit: limit + 1,
    });

    return buildCursorResponse(tickets, limit);
  };
};

const buildCursorResponse = (items, limit) => {
  const hasNextPage = items.length > limit;
  const nodes = hasNextPage ? items.slice(0, limit) : items;
  const lastItem = nodes[nodes.length - 1];
  const nextCursor =
    hasNextPage && lastItem
      ? encodeCursor({ createdAt: lastItem.createdAt, id: lastItem._id })
      : null;

  return {
    items: nodes,
    pageInfo: {
      limit,
      hasNextPage,
      nextCursor,
    },
  };
};

const getBerlinDayRange = now => {
  const timeZone = "Europe/Berlin";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(now)
    .reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});

  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);

  const offsetMs = getTimeZoneOffsetMs(
    new Date(Date.UTC(year, month - 1, day, 12, 0, 0)),
    timeZone
  );

  const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - offsetMs);
  const end = new Date(
    Date.UTC(year, month - 1, day, 23, 59, 59, 999) - offsetMs
  );

  return { start, end };
};

const getTimeZoneOffsetMs = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .formatToParts(date)
    .reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});

  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );

  return asUtc - date.getTime();
};
