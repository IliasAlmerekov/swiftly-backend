import Ticket from "./models/ticketModel.js";
import User from "./models/userModel.js";
import Solution from "./models/solutionModel.js";
import RefreshToken from "./models/refreshTokenModel.js";
import cloudinary from "./config/cloudinary.js";

import MongooseTicketRepository from "./infrastructure/persistence/mongoose/MongooseTicketRepository.js";
import MongooseUserRepository from "./infrastructure/persistence/mongoose/MongooseUserRepository.js";
import MongooseRefreshTokenRepository from "./infrastructure/persistence/mongoose/MongooseRefreshTokenRepository.js";
import CloudinaryFileStorage from "./infrastructure/storage/CloudinaryFileStorage.js";
import BcryptPasswordHasher from "./infrastructure/security/BcryptPasswordHasher.js";
import JwtTokenProvider from "./infrastructure/security/JwtTokenProvider.js";
import SolutionRepository from "./repositories/solutionRepository.js";

import AuthService from "./services/authService.js";
import TicketService from "./services/ticketService.js";
import UserService from "./services/userService.js";
import SolutionService from "./services/solutionService.js";

const ticketRepository = new MongooseTicketRepository({ Ticket });
const userRepository = new MongooseUserRepository({ User });
const refreshTokenRepository = new MongooseRefreshTokenRepository({ RefreshToken });
const solutionRepository = new SolutionRepository({ Solution });
const fileStorage = new CloudinaryFileStorage({ cloudinary });
const passwordHasher = new BcryptPasswordHasher();
const tokenProvider = new JwtTokenProvider();

const ticketService = new TicketService({
  ticketRepository,
  userRepository,
  fileStorage,
});
const authService = new AuthService({
  userRepo: userRepository,
  refreshTokenRepo: refreshTokenRepository,
  passwordHasher,
  tokenProvider,
});
const userService = new UserService({ userRepository });
const solutionService = new SolutionService({ solutionRepository });

export default {
  authService,
  ticketService,
  userService,
  solutionService,
};
