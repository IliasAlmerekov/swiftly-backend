class SolutionRepository {
  constructor({ Solution }) {
    this.Solution = Solution;
  }

  findAll(filter, { skip, limit }) {
    return this.Solution.find(filter)
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  }

  count(filter) {
    return this.Solution.countDocuments(filter);
  }

  findById(id) {
    return this.Solution.findById(id).populate("createdBy", "name email");
  }

  create(data) {
    return this.Solution.create(data);
  }

  updateById(id, updateData) {
    return this.Solution.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("createdBy", "name email");
  }

  deactivateById(id) {
    return this.Solution.findByIdAndUpdate(id, { isActive: false }, { new: true });
  }

  search(query, limit) {
    return this.Solution.find({
      isActive: true,
      $or: [
        { $text: { $search: query } },
        { title: { $regex: query, $options: "i" } },
        { problem: { $regex: query, $options: "i" } },
        { keywords: { $elemMatch: { $regex: query, $options: "i" } } },
      ],
    })
      .select("title problem solution category priority keywords")
      .limit(limit)
      .sort({ _id: -1 });
  }

  aggregate(pipeline) {
    return this.Solution.aggregate(pipeline);
  }
}

export default SolutionRepository;
