//api/organizations.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const organizations = await prisma.organization.findMany();
    res.status(200).json(organizations);
  } catch (error) {
    console.log(error, 'fetch organizations')
    res.status(500).json({ error: `Error fetching organizations ${error}` });
  }
}
