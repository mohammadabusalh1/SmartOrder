import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

interface AuthenticatedUser {
  id: string;
  user_type: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const token = req.get("Authorization") || "";
  const user = authentication(token);

  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  req.user = user;
  next();
};

// Authentication function for GraphQL context
const authentication = (token: string) => {
  if (!token || !token.startsWith("Bearer ")) {
    return null;
  }

  try {
    const jwtToken = token.split(" ")[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET is not defined");
    }
    const decoded = jwt.verify(jwtToken, secret) as jwt.JwtPayload;
    return {
      id: decoded.id,
      user_type: decoded.userType,
      email: decoded.email,
    };
  } catch (error) {
    return null;
  }
};
