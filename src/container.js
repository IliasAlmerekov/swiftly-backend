import fs from "fs";
import Ticket from "./models/ticketModel.js";
import User from "./models/userModel.js";
import Solution from "./models/solutionModel.js";
import cloudinary from "./config/cloudinary.js";

import TicketRepository from "./repositories/ticketRepository.js";
import UserRepository from "./repositories/userRepository.js";
import SolutionRepository from "./repositories/solutionRepository.js";

import TicketService from "./services/ticketService.js";
import UserService from "./services/userService.js";
import SolutionService from "./services/solutionService.js";

const ticketRepository = new TicketRepository({ Ticket });
const userRepository = new UserRepository({ User });
const solutionRepository = new SolutionRepository({ Solution });

const ticketService = new TicketService({ ticketRepository, userRepository, cloudinary, fs });
const userService = new UserService({ userRepository });
const solutionService = new SolutionService({ solutionRepository });

export default {
  ticketService,
  userService,
  solutionService,
};
