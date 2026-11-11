import type { UserRole } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";

export const authorize = (...allowedRoles: UserRole[]) => (request: Request, response: Response, next: NextFunction): void => {
	if (!request.userRole || !allowedRoles.includes(request.userRole)) { response.status(403).json({ error: "You do not have permission to access this resource" }); return; }
	next();
};
