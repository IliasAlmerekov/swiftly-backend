import mongoose from "mongoose";

class SolutionService {
  constructor({ solutionRepository }) {
    this.solutionRepository = solutionRepository;
  }

  async getAllSolutions(query) {
    const {
      category,
      priority,
      isActive = true,
      page = 1,
      limit = 10,
      search,
    } = query;

    const filter = { isActive };
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (search) filter.$text = { $search: search };

    const skip = (page - 1) * limit;

    const solutions = await this.solutionRepository.findAll(filter, {
      skip,
      limit: parseInt(limit, 10),
    });
    const total = await this.solutionRepository.count(filter);

    return {
      solutions,
      pagination: {
        currentPage: parseInt(page, 10),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit, 10),
      },
    };
  }

  async getSolutionById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Ungültige Lösungs-ID");
      error.status = 400;
      throw error;
    }

    const solution = await this.solutionRepository.findById(id);
    if (!solution) {
      const error = new Error("Lösung nicht gefunden");
      error.status = 404;
      throw error;
    }
    return solution;
  }

  async createSolution(data, user) {
    const { title, problem, solution, keywords, category, priority } = data;
    if (!title || !problem || !solution) {
      const error = new Error("Titel, Problem und Lösung sind erforderlich");
      error.status = 400;
      throw error;
    }

    const createdBy = user?.id;
    const newSolution = await this.solutionRepository.create({
      title,
      problem,
      solution,
      keywords: keywords || [],
      category: category || "Sonstiges",
      priority: priority || "Medium",
      createdBy,
    });

    return this.solutionRepository.findById(newSolution._id);
  }

  async updateSolution(id, updateData) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Ungültige Lösungs-ID");
      error.status = 400;
      throw error;
    }

    const updatedSolution = await this.solutionRepository.updateById(
      id,
      updateData
    );
    if (!updatedSolution) {
      const error = new Error("Lösung nicht gefunden");
      error.status = 404;
      throw error;
    }
    return updatedSolution;
  }

  async deleteSolution(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Ungültige Lösungs-ID");
      error.status = 400;
      throw error;
    }

    const deletedSolution = await this.solutionRepository.deactivateById(id);
    if (!deletedSolution) {
      const error = new Error("Lösung nicht gefunden");
      error.status = 404;
      throw error;
    }
  }

  async searchSolutions(queryParams) {
    const { query, limit = 5 } = queryParams;
    if (!query) {
      const error = new Error("Suchbegriff ist erforderlich");
      error.status = 400;
      throw error;
    }

    const solutions = await this.solutionRepository.search(
      query,
      parseInt(limit, 10)
    );
    return {
      query,
      solutions,
      count: solutions.length,
    };
  }

  async getSolutionStats() {
    const totalSolutions = await this.solutionRepository.count({
      isActive: true,
    });
    const categoryStats = await this.solutionRepository.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const priorityStats = await this.solutionRepository.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$priority", count: { $sum: 1 } } },
    ]);

    return {
      totalSolutions,
      categoryStats,
      priorityStats,
    };
  }
}

export default SolutionService;
