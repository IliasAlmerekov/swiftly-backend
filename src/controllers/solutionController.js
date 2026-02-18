import { asyncHandler } from "../utils/asyncHandler.js";
import { validateDto } from "../validation/validateDto.js";
import {
  solutionCreateDto,
  solutionIdParamDto,
  solutionListDto,
  solutionSearchDto,
  solutionUpdateDto,
} from "../validation/schemas.js";

export const createSolutionController = ({ solutionService }) => ({
  getAllSolutions: asyncHandler(async (req, res) => {
    const query = validateDto(solutionListDto, req.query);
    const data = await solutionService.getAllSolutions(query);
    res.json({
      success: true,
      data,
    });
  }),

  getSolutionById: asyncHandler(async (req, res) => {
    const { id } = validateDto(solutionIdParamDto, req.params);
    const solution = await solutionService.getSolutionById(id);
    res.json({
      success: true,
      data: solution,
    });
  }),

  createSolution: asyncHandler(async (req, res) => {
    const payload = validateDto(solutionCreateDto, req.body);
    const solution = await solutionService.createSolution(payload, req.user);
    res.status(201).json({
      success: true,
      message: "Lösung erfolgreich erstellt",
      data: solution,
    });
  }),

  updateSolution: asyncHandler(async (req, res) => {
    const { id } = validateDto(solutionIdParamDto, req.params);
    const payload = validateDto(solutionUpdateDto, req.body);
    const solution = await solutionService.updateSolution(id, payload);
    res.json({
      success: true,
      message: "Lösung erfolgreich aktualisiert",
      data: solution,
    });
  }),

  deleteSolution: asyncHandler(async (req, res) => {
    const { id } = validateDto(solutionIdParamDto, req.params);
    await solutionService.deleteSolution(id);
    res.json({
      success: true,
      message: "Lösung erfolgreich deaktiviert",
    });
  }),

  searchSolutions: asyncHandler(async (req, res) => {
    const query = validateDto(solutionSearchDto, req.query);
    const data = await solutionService.searchSolutions(query);
    res.json({
      success: true,
      data,
    });
  }),

  getSolutionStats: asyncHandler(async (req, res) => {
    const data = await solutionService.getSolutionStats();
    res.json({
      success: true,
      data,
    });
  }),
});
