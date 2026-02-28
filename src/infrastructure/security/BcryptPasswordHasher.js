import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

class BcryptPasswordHasher {
  async hash(plainValue) {
    return bcrypt.hash(plainValue, SALT_ROUNDS);
  }

  async compare(plainValue, hashedValue) {
    return bcrypt.compare(plainValue, hashedValue);
  }
}

export default BcryptPasswordHasher;
