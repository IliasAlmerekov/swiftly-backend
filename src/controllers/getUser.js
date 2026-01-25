import { asyncHandler } from "../utils/asyncHandler.js";
import { validateDto } from "../validation/validateDto.js";
import { userIdParamDto, userProfileUpdateDto } from "../validation/schemas.js";

export const createUserController = ({ userService }) => ({
  getUser: asyncHandler(async (req, res) => {
    const result = await userService.getSupportUsers();
    res.json(result);
  }),

  getUserProfile: asyncHandler(async (req, res) => {
    const user = await userService.getUserProfile(req.user._id);
    res.status(200).json(user);
  }),

  updateUserProfile: asyncHandler(async (req, res) => {
    const updateData = validateDto(userProfileUpdateDto, req.body);
    const user = await userService.updateUserProfile(req.user._id, updateData);
    res.status(200).json(user);
  }),

  getUserById: asyncHandler(async (req, res) => {
    const { userId } = validateDto(userIdParamDto, req.params);
    const user = await userService.getUserById(userId);
    res.status(200).json(user);
  }),

  updateUserProfileById: asyncHandler(async (req, res) => {
    const { userId } = validateDto(userIdParamDto, req.params);
    const updateData = validateDto(userProfileUpdateDto, req.body);
    const user = await userService.updateUserProfileById(
      req.user,
      userId,
      updateData
    );
    res.status(200).json(user);
  }),

  getAllUsers: asyncHandler(async (req, res) => {
    if (req.user.role !== "admin") {
      const user = await userService.getUserProfile(req.user._id);
      return res.status(200).json(user);
    }
    const users = await userService.getAllUsers();
    res.status(200).json(users);
  }),
});
