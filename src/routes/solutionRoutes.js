import express from 'express';
import { createSolutionController } from "../controllers/solutionController.js";
import container from "../container.js";
import authMiddleware from '../middlewares/authMiddleware.js';
import { requireRole } from "../middlewares/roleMiddleware.js";

const router = express.Router();
const solutionController = createSolutionController(container);

// Middleware für alle Solution Routes - Authentifizierung erforderlich
router.use(authMiddleware);

/**
 * @route   GET /api/solutions
 * @desc    Alle Lösungen abrufen (mit Filterung und Pagination)
 * @query   category, priority, isActive, page, limit, search
 * @access  Private (alle authentifizierten Benutzer)
 */
router.get('/', solutionController.getAllSolutions);

/**
 * @route   GET /api/solutions/search
 * @desc    Lösungen durchsuchen (speziell für AI-Service)
 * @query   query (Suchbegriff), limit
 * @access  Private
 */
router.get('/search', solutionController.searchSolutions);

/**
 * @route   GET /api/solutions/stats
 * @desc    Statistiken über Lösungen abrufen
 * @access  Private (normalerweise nur für Admins)
 */
router.get('/stats', requireRole(["support1", "admin"]), solutionController.getSolutionStats);

/**
 * @route   GET /api/solutions/:id
 * @desc    Einzelne Lösung nach ID abrufen
 * @param   id - MongoDB ObjectId der Lösung
 * @access  Private
 */
router.get('/:id', solutionController.getSolutionById);

/**
 * @route   POST /api/solutions
 * @desc    Neue Lösung erstellen
 * @body    title, problem, solution, keywords, category, priority
 * @access  Private (normalerweise nur Support-Mitarbeiter)
 */
router.post('/', requireRole(["support1", "admin"]), solutionController.createSolution);

/**
 * @route   PUT /api/solutions/:id
 * @desc    Bestehende Lösung aktualisieren
 * @param   id - MongoDB ObjectId der Lösung
 * @body    Felder die aktualisiert werden sollen
 * @access  Private (normalerweise nur Support-Mitarbeiter oder Creator)
 */
router.put('/:id', requireRole(["support1", "admin"]), solutionController.updateSolution);

/**
 * @route   DELETE /api/solutions/:id
 * @desc    Lösung deaktivieren (Soft Delete)
 * @param   id - MongoDB ObjectId der Lösung
 * @access  Private (normalerweise nur Admins)
 */
router.delete('/:id', requireRole(["support1", "admin"]), solutionController.deleteSolution);

export default router;
