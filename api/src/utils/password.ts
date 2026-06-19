import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

// hash password
export const hashPassword = async (password: string) => {
    return bcrypt.hash(password, SALT_ROUNDS);
};

// verify password against hash
export const comparePassword = async (
    password: string,
    hash: string
) => {
    return bcrypt.compare(password, hash);
};