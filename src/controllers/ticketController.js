import { asyncHandler } from "../utils/asyncHandler.js";
import { validateDto } from "../validation/validateDto.js";
import {
  ticketCommentDto,
  ticketCreateDto,
  ticketIdParamDto,
  ticketListDto,
  ticketTriageDto,
  ticketUpdateDto,
} from "../validation/schemas.js";

export const createTicketController = ({ ticketService }) => ({
  listTickets: asyncHandler(async (req, res) => {
    const query = validateDto(ticketListDto, req.query);
    const tickets = await ticketService.listTickets(req.user, query);
    res.status(200).json(tickets);
  }),

  getTicketsToday: asyncHandler(async (req, res) => {
    const ticketsToday = await ticketService.getTicketsToday();
    res.status(200).json({ ticketsToday });
  }),

  addComment: asyncHandler(async (req, res) => {
    const { ticketId } = validateDto(ticketIdParamDto, req.params);
    const { content } = validateDto(ticketCommentDto, req.body);
    const updatedTicket = await ticketService.addComment(
      ticketId,
      content,
      req.user
    );
    res.status(201).json(updatedTicket);
  }),

  getTicketById: asyncHandler(async (req, res) => {
    const { ticketId } = validateDto(ticketIdParamDto, req.params);
    const ticket = await ticketService.getTicketById(ticketId, req.user);
    res.status(200).json(ticket);
  }),

  createTicket: asyncHandler(async (req, res) => {
    const { title, description } = validateDto(ticketCreateDto, req.body);
    const ticket = await ticketService.createTicket({
      title,
      description,
      user: req.user,
    });
    res.status(201).json(ticket);
  }),

  updateTicket: asyncHandler(async (req, res) => {
    const { ticketId } = validateDto(ticketIdParamDto, req.params);
    const updateData = validateDto(ticketUpdateDto, req.body);
    const updatedTicket = await ticketService.updateTicket(
      ticketId,
      updateData,
      req.user
    );
    res.status(200).json(updatedTicket);
  }),

  triageTicket: asyncHandler(async (req, res) => {
    const { ticketId } = validateDto(ticketIdParamDto, req.params);
    const triageData = validateDto(ticketTriageDto, req.body);
    const updatedTicket = await ticketService.triageTicket(
      ticketId,
      triageData,
      req.user
    );
    res.status(200).json(updatedTicket);
  }),

  getTicketStats: asyncHandler(async (req, res) => {
    const stats = await ticketService.getTicketStats();
    res.status(200).json(stats);
  }),

  getUserTicketStats: asyncHandler(async (req, res) => {
    const stats = await ticketService.getUserTicketStats(req.user);
    res.status(200).json(stats);
  }),

  uploadTicketAttachment: asyncHandler(async (req, res) => {
    const { ticketId } = validateDto(ticketIdParamDto, req.params);
    const attachments = await ticketService.uploadAttachment(
      ticketId,
      req.file,
      req.user
    );
    res.status(201).json({ success: true, attachments });
  }),
});
