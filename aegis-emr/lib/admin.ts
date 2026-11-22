export const isAdmin = (req: Request) => !!process.env.ADMIN_API_KEY && req.headers.get("x-admin-key") === process.env.ADMIN_API_KEY;
