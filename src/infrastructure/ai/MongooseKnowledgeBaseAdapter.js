const SELECT_FIELDS = "title problem solution category priority keywords";
const DEFAULT_SORT = { updatedAt: -1 };
const TEXT_SORT = { score: { $meta: "textScore" }, updatedAt: -1 };

const normalize = text => (text || "").toLowerCase();

const dedupeById = records => {
  const map = new Map();
  for (const record of records) {
    map.set(record._id.toString(), record);
  }
  return [...map.values()];
};

const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

class MongooseKnowledgeBaseAdapter {
  constructor({ SolutionModel, AIRequestLogModel, logger }) {
    this.Solution = SolutionModel;
    this.AIRequestLog = AIRequestLogModel;
    this.logger = logger || { error: () => {} };
  }

  async logRequest({ prompt }) {
    await this.AIRequestLog.create({ prompt });
  }

  async searchSolutions({ query, limit = 5 }) {
    if (!query || typeof query !== "string") {
      return [];
    }

    const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 5;
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      return [];
    }

    try {
      try {
        const textResults = await this.Solution.find({
          isActive: true,
          $text: { $search: normalizedQuery },
        })
          .select(SELECT_FIELDS)
          .sort(TEXT_SORT)
          .limit(safeLimit);

        if (textResults.length > 0) {
          return textResults;
        }
      } catch {
        // Text index is optional.
      }

      const safeQueryRegex = new RegExp(
        escapeRegExp(normalizedQuery.slice(0, 200)),
        "i"
      );
      const searchTerms = normalize(normalizedQuery)
        .split(/\s+/)
        .filter(term => term.length > 2)
        .slice(0, 8);

      let keywordMatchesPromise = Promise.resolve([]);
      if (searchTerms.length > 0) {
        keywordMatchesPromise = this.Solution.find({
          isActive: true,
          keywords: {
            $in: searchTerms.map(term => new RegExp(escapeRegExp(term), "i")),
          },
        })
          .select(SELECT_FIELDS)
          .sort(DEFAULT_SORT)
          .limit(safeLimit);
      }

      const [titleMatches, problemMatches, keywordMatches] = await Promise.all([
        this.Solution.find({
          isActive: true,
          title: { $regex: safeQueryRegex },
        })
          .select(SELECT_FIELDS)
          .sort(DEFAULT_SORT)
          .limit(safeLimit),
        this.Solution.find({
          isActive: true,
          problem: { $regex: safeQueryRegex },
        })
          .select(SELECT_FIELDS)
          .sort(DEFAULT_SORT)
          .limit(safeLimit),
        keywordMatchesPromise,
      ]);

      return dedupeById([
        ...titleMatches,
        ...problemMatches,
        ...keywordMatches,
      ]).slice(0, safeLimit);
    } catch (error) {
      this.logger.error({ err: error }, "AI solution search failed");
      return [];
    }
  }
}

export default MongooseKnowledgeBaseAdapter;

