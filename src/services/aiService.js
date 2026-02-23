import aiService from "../composition/aiService.js";
import {
  countHits as _countHits,
  detectLang as _detectLang,
  matchAny as _matchAny,
} from "../application/ai/policy/aiPolicy.js";

export default aiService;
export { _detectLang, _matchAny, _countHits };
