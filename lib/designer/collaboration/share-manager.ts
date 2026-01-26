/**
 * Share Manager - Design sharing system with permission levels
 * Enables shareable links and collaborative access control
 */

import { nanoid } from 'nanoid';

export interface ShareableDesign {
  id: string;
  ownerId: string;
  code: string;
  title: string;
  description?: string;
  templateId?: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  isPublic: boolean;
}

export type PermissionLevel = 'view' | 'comment' | 'edit';

export interface SharePermission {
  userId: string;
  userName?: string;
  level: PermissionLevel;
  grantedAt: Date;
  expiresAt?: Date;
}

export interface ShareLink {
  id: string;
  designId: string;
  token: string;
  permission: PermissionLevel;
  createdAt: Date;
  expiresAt?: Date;
  accessCount: number;
  maxAccesses?: number;
  isActive: boolean;
}

export interface ShareSettings {
  allowComments: boolean;
  allowCopy: boolean;
  showAuthor: boolean;
  requireAuth: boolean;
  watermark: boolean;
}

const STORAGE_KEY = 'cognia-designer-shares';
const LINKS_STORAGE_KEY = 'cognia-designer-share-links';

/**
 * Generate a secure share token
 */
function generateShareToken(): string {
  return nanoid(32);
}

/**
 * Get all shared designs from storage
 */
export function getSharedDesigns(): ShareableDesign[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const designs = JSON.parse(stored) as ShareableDesign[];
    return designs.map((d) => ({
      ...d,
      createdAt: new Date(d.createdAt),
      updatedAt: new Date(d.updatedAt),
      expiresAt: d.expiresAt ? new Date(d.expiresAt) : undefined,
    }));
  } catch {
    return [];
  }
}

/**
 * Save shared designs to storage
 */
function saveSharedDesigns(designs: ShareableDesign[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(designs));
}

/**
 * Get all share links from storage
 */
export function getShareLinks(): ShareLink[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(LINKS_STORAGE_KEY);
    if (!stored) return [];
    
    const links = JSON.parse(stored) as ShareLink[];
    return links.map((l) => ({
      ...l,
      createdAt: new Date(l.createdAt),
      expiresAt: l.expiresAt ? new Date(l.expiresAt) : undefined,
    }));
  } catch {
    return [];
  }
}

/**
 * Save share links to storage
 */
function saveShareLinks(links: ShareLink[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LINKS_STORAGE_KEY, JSON.stringify(links));
}

/**
 * Create a shareable design
 */
export function createShareableDesign(
  code: string,
  ownerId: string,
  options: {
    title?: string;
    description?: string;
    templateId?: string;
    expiresIn?: number;
    isPublic?: boolean;
  } = {}
): ShareableDesign {
  const now = new Date();
  
  const design: ShareableDesign = {
    id: nanoid(),
    ownerId,
    code,
    title: options.title || 'Untitled Design',
    description: options.description,
    templateId: options.templateId,
    createdAt: now,
    updatedAt: now,
    expiresAt: options.expiresIn
      ? new Date(now.getTime() + options.expiresIn)
      : undefined,
    isPublic: options.isPublic ?? false,
  };

  const designs = getSharedDesigns();
  designs.push(design);
  saveSharedDesigns(designs);

  return design;
}

/**
 * Update a shareable design
 */
export function updateShareableDesign(
  designId: string,
  updates: Partial<Pick<ShareableDesign, 'code' | 'title' | 'description' | 'isPublic' | 'expiresAt'>>
): ShareableDesign | null {
  const designs = getSharedDesigns();
  const index = designs.findIndex((d) => d.id === designId);
  
  if (index === -1) return null;
  
  designs[index] = {
    ...designs[index],
    ...updates,
    updatedAt: new Date(),
  };
  
  saveSharedDesigns(designs);
  return designs[index];
}

/**
 * Delete a shareable design
 */
export function deleteShareableDesign(designId: string): boolean {
  const designs = getSharedDesigns();
  const filtered = designs.filter((d) => d.id !== designId);
  
  if (filtered.length === designs.length) return false;
  
  saveSharedDesigns(filtered);
  
  // Also delete associated share links
  const links = getShareLinks();
  const filteredLinks = links.filter((l) => l.designId !== designId);
  saveShareLinks(filteredLinks);
  
  return true;
}

/**
 * Get a shareable design by ID
 */
export function getShareableDesign(designId: string): ShareableDesign | null {
  const designs = getSharedDesigns();
  return designs.find((d) => d.id === designId) || null;
}

/**
 * Create a share link for a design
 */
export function createShareLink(
  designId: string,
  permission: PermissionLevel = 'view',
  options: {
    expiresIn?: number;
    maxAccesses?: number;
  } = {}
): ShareLink | null {
  const design = getShareableDesign(designId);
  if (!design) return null;

  const now = new Date();
  
  const link: ShareLink = {
    id: nanoid(),
    designId,
    token: generateShareToken(),
    permission,
    createdAt: now,
    expiresAt: options.expiresIn
      ? new Date(now.getTime() + options.expiresIn)
      : undefined,
    accessCount: 0,
    maxAccesses: options.maxAccesses,
    isActive: true,
  };

  const links = getShareLinks();
  links.push(link);
  saveShareLinks(links);

  return link;
}

/**
 * Get share link by token
 */
export function getShareLinkByToken(token: string): ShareLink | null {
  const links = getShareLinks();
  return links.find((l) => l.token === token && l.isActive) || null;
}

/**
 * Access a shared design via token
 */
export function accessSharedDesign(token: string): {
  success: boolean;
  design?: ShareableDesign;
  permission?: PermissionLevel;
  error?: string;
} {
  const link = getShareLinkByToken(token);
  
  if (!link) {
    return { success: false, error: 'Invalid or expired link' };
  }
  
  // Check expiration
  if (link.expiresAt && new Date() > link.expiresAt) {
    return { success: false, error: 'Link has expired' };
  }
  
  // Check max accesses
  if (link.maxAccesses && link.accessCount >= link.maxAccesses) {
    return { success: false, error: 'Link access limit reached' };
  }
  
  const design = getShareableDesign(link.designId);
  if (!design) {
    return { success: false, error: 'Design not found' };
  }
  
  // Check design expiration
  if (design.expiresAt && new Date() > design.expiresAt) {
    return { success: false, error: 'Design has expired' };
  }
  
  // Increment access count
  const links = getShareLinks();
  const linkIndex = links.findIndex((l) => l.id === link.id);
  if (linkIndex !== -1) {
    links[linkIndex].accessCount++;
    saveShareLinks(links);
  }
  
  return {
    success: true,
    design,
    permission: link.permission,
  };
}

/**
 * Revoke a share link
 */
export function revokeShareLink(linkId: string): boolean {
  const links = getShareLinks();
  const index = links.findIndex((l) => l.id === linkId);
  
  if (index === -1) return false;
  
  links[index].isActive = false;
  saveShareLinks(links);
  
  return true;
}

/**
 * Get all share links for a design
 */
export function getDesignShareLinks(designId: string): ShareLink[] {
  return getShareLinks().filter((l) => l.designId === designId);
}

/**
 * Generate a shareable URL
 */
export function generateShareUrl(token: string, baseUrl?: string): string {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/designer/shared?token=${token}`;
}

/**
 * Parse share token from URL
 */
export function parseShareToken(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('token');
  } catch {
    return null;
  }
}

/**
 * Get user's shared designs
 */
export function getUserSharedDesigns(userId: string): ShareableDesign[] {
  return getSharedDesigns().filter((d) => d.ownerId === userId);
}

/**
 * Get public designs
 */
export function getPublicDesigns(): ShareableDesign[] {
  return getSharedDesigns().filter((d) => d.isPublic && (!d.expiresAt || new Date() < d.expiresAt));
}

const shareManagerAPI = {
  createShareableDesign,
  updateShareableDesign,
  deleteShareableDesign,
  getShareableDesign,
  getSharedDesigns,
  createShareLink,
  getShareLinkByToken,
  accessSharedDesign,
  revokeShareLink,
  getDesignShareLinks,
  generateShareUrl,
  parseShareToken,
  getUserSharedDesigns,
  getPublicDesigns,
};

export default shareManagerAPI;
