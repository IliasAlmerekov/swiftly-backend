import Ticket from "./models/ticketModel.js";
import User from "./models/userModel.js";
import Solution from "./models/solutionModel.js";
import cloudinary from "./config/cloudinary.js";

import MongooseTicketRepository from "./infrastructure/persistence/mongoose/MongooseTicketRepository.js";
import MongooseUserRepository from "./infrastructure/persistence/mongoose/MongooseUserRepository.js";
import CloudinaryFileStorage from "./infrastructure/storage/CloudinaryFileStorage.js";
import SolutionRepository from "./repositories/solutionRepository.js";

import TicketService from "./services/ticketService.js";
import UserService from "./services/userService.js";
import SolutionService from "./services/solutionService.js";

const ticketRepository = new MongooseTicketRepository({ Ticket });
const userRepository = new MongooseUserRepository({ User });
const solutionRepository = new SolutionRepository({ Solution });
const fileStorage = new CloudinaryFileStorage({ cloudinary });

const ticketService = new TicketService({
  ticketRepository,
  userRepository,
  fileStorage,
});
const userService = new UserService({ userRepository });
const solutionService = new SolutionService({ solutionRepository });

export default {
  ticketService,
  userService,
  solutionService,
};
