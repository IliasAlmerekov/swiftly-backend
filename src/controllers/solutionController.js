import Solution from '../models/solutionModel.js';
import mongoose from 'mongoose';

class SolutionController {
  
  // Alle Lösungen abrufen (mit Filterung und Pagination)
  async getAllSolutions(req, res) {
    try {
      const { 
        category, 
        priority, 
        isActive = true, 
        page = 1, 
        limit = 10,
        search 
      } = req.query;

      // Filter-Objekt erstellen
      const filter = { isActive };
      
      if (category) filter.category = category;
      if (priority) filter.priority = priority;
      
      // Textsuche wenn search-Parameter vorhanden
      if (search) {
        filter.$text = { $search: search };
      }

      const skip = (page - 1) * limit;

      const solutions = await Solution.find(filter)
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Solution.countDocuments(filter);

      res.json({
        success: true,
        data: {
          solutions,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            totalItems: total,
            itemsPerPage: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Fehler beim Abrufen der Lösungen:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler beim Abrufen der Lösungen',
        error: error.message
      });
    }
  }

  // Einzelne Lösung nach ID abrufen
  async getSolutionById(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'Ungültige Lösungs-ID'
        });
      }

      const solution = await Solution.findById(id)
        .populate('createdBy', 'name email');

      if (!solution) {
        return res.status(404).json({
          success: false,
          message: 'Lösung nicht gefunden'
        });
      }

      res.json({
        success: true,
        data: solution
      });
    } catch (error) {
      console.error('Fehler beim Abrufen der Lösung:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler beim Abrufen der Lösung',
        error: error.message
      });
    }
  }

  // Neue Lösung erstellen
  async createSolution(req, res) {
    try {
      const { title, problem, solution, keywords, category, priority } = req.body;
      const createdBy = req.user?.id; // Aus dem Auth Middleware

      // Validierung
      if (!title || !problem || !solution) {
        return res.status(400).json({
          success: false,
          message: 'Titel, Problem und Lösung sind erforderlich'
        });
      }

      const newSolution = new Solution({
        title,
        problem,
        solution,
        keywords: keywords || [],
        category: category || 'Sonstiges',
        priority: priority || 'Medium',
        createdBy
      });

      await newSolution.save();

      const populatedSolution = await Solution.findById(newSolution._id)
        .populate('createdBy', 'name email');

      res.status(201).json({
        success: true,
        message: 'Lösung erfolgreich erstellt',
        data: populatedSolution
      });
    } catch (error) {
      console.error('Fehler beim Erstellen der Lösung:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler beim Erstellen der Lösung',
        error: error.message
      });
    }
  }

  // Lösung aktualisieren
  async updateSolution(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'Ungültige Lösungs-ID'
        });
      }

      // updatedAt wird automatisch durch das Schema-Middleware gesetzt
      const updatedSolution = await Solution.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).populate('createdBy', 'name email');

      if (!updatedSolution) {
        return res.status(404).json({
          success: false,
          message: 'Lösung nicht gefunden'
        });
      }

      res.json({
        success: true,
        message: 'Lösung erfolgreich aktualisiert',
        data: updatedSolution
      });
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Lösung:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler beim Aktualisieren der Lösung',
        error: error.message
      });
    }
  }

  // Lösung löschen (Soft Delete - isActive auf false setzen)
  async deleteSolution(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'Ungültige Lösungs-ID'
        });
      }

      const deletedSolution = await Solution.findByIdAndUpdate(
        id,
        { isActive: false },
        { new: true }
      );

      if (!deletedSolution) {
        return res.status(404).json({
          success: false,
          message: 'Lösung nicht gefunden'
        });
      }

      res.json({
        success: true,
        message: 'Lösung erfolgreich deaktiviert'
      });
    } catch (error) {
      console.error('Fehler beim Löschen der Lösung:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler beim Löschen der Lösung',
        error: error.message
      });
    }
  }

  // Lösungen nach Suchbegriff suchen (für AI-Service)
  async searchSolutions(req, res) {
    try {
      const { query, limit = 5 } = req.query;

      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Suchbegriff ist erforderlich'
        });
      }

      // Kombination aus Textsuche und Keyword-Matching
      const solutions = await Solution.find({
        isActive: true,
        $or: [
          { $text: { $search: query } },
          { title: { $regex: query, $options: 'i' } },
          { problem: { $regex: query, $options: 'i' } },
          { keywords: { $elemMatch: { $regex: query, $options: 'i' } } }
        ]
      })
      .select('title problem solution category priority keywords')
      .limit(parseInt(limit))
      .sort({ _id: -1 }); // Neueste zuerst

      res.json({
        success: true,
        data: {
          query,
          solutions,
          count: solutions.length
        }
      });
    } catch (error) {
      console.error('Fehler bei der Lösungssuche:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler bei der Lösungssuche',
        error: error.message
      });
    }
  }

  // Statistiken über Lösungen abrufen
  async getSolutionStats(req, res) {
    try {
      const totalSolutions = await Solution.countDocuments({ isActive: true });
      
      const categoryStats = await Solution.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      const priorityStats = await Solution.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ]);

      res.json({
        success: true,
        data: {
          totalSolutions,
          categoryStats,
          priorityStats
        }
      });
    } catch (error) {
      console.error('Fehler beim Abrufen der Statistiken:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler beim Abrufen der Statistiken',
        error: error.message
      });
    }
  }
}

export default new SolutionController();
