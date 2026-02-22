import bcrypt from "bcryptjs";

class BcryptPasswordHasher {
  async compare(plainValue, hashedValue) {
    return bcrypt.compare(plainValue, hashedValue);
  }
}

export default BcryptPasswordHasher;
