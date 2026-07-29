import { supabase } from '@/lib/supabaseClient';

// Test Supabase connectivity
export async function testSupabaseConnection() {
  try {
    const { error } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Supabase connection test error:', error);
    return false;
  }
}

// Enhanced Profile Type
export interface Profile {
  id?: string;
  address: string;
  username?: string;
  email?: string;
  lightning_address?: string;
  
  // Basic Profile Info
  display_name?: string;
  tagline?: string;
  biography?: string;
  location?: string;
  
  // Social Media Links
  website?: string;
  twitter?: string;
  discord?: string;
  github_url?: string;
  instagram?: string;
  linkedin?: string;
  
  // 3D/Art Portfolio Platforms
  artstation?: string;
  sketchfab?: string;
  fab?: string;
  turbosquid?: string;
  cgtrader?: string;
  behance?: string;
  
  // Professional Info
  skills?: string[];
  occupation?: string;
  company?: string;
  years_experience?: number;
  bitcoin_experience_level?: string;
  bitcoin_tech_stack?: string;
  bitcoin_project_url?: string;
  
  // Profile Media
  avatar_url?: string;
  avatar_cid?: string;
  banner_url?: string;
  banner_cid?: string;
  portfolio_urls?: string[];
  
  // NFT Platform Specific
  creator_verified?: boolean;
  verified_artist?: boolean;
  total_nfts_created?: number;
  total_nfts_owned?: number;
  total_sales_stx?: number;
  
  // Privacy Settings
  profile_public?: boolean;
  show_email?: boolean;
  show_location?: boolean;
  hide_welcome_modal?: boolean;
  linked_nostr_public_key?: string;
  wallet_type?: string;
  wallet_public_key?: string;
  wallet_signature?: string;
  wallet_proof_timestamp?: string;
  
  // Notifications Settings
  email_notifications?: boolean;
  push_notifications?: boolean;
  marketing_emails?: boolean;
  developer_mode?: boolean;
  
  // Account Status
  account_status?: 'active' | 'suspended' | 'deleted';
  email_verified?: boolean;
  kyc_verified?: boolean;
  
  // Timestamps
  created_at?: string;
  updated_at?: string;
  last_active?: string;
}

export async function getProfileDeveloperMode(address: string): Promise<boolean> {
  const response = await fetch(`/api/profile/developer-mode?address=${encodeURIComponent(address)}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || 'Failed to load Developer Mode');
  }

  const body = await response.json();
  return Boolean(body?.developer_mode);
}

export async function updateProfileDeveloperMode(address: string, developerMode: boolean): Promise<boolean> {
  const response = await fetch('/api/profile/developer-mode', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      address,
      developer_mode: developerMode,
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || 'Failed to save Developer Mode');
  }

  const body = await response.json();
  return Boolean(body?.developer_mode);
}

export async function getProfile(address: string): Promise<Profile | null> {
  try {
    const response = await fetch(`/api/profile/${encodeURIComponent(address)}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error || 'Failed to load profile');
    }

    const body = await response.json();
    const profile = body?.profile;

    if (!profile) {
      return null;
    }

    return profile as Profile;
  } catch (error) {
    console.error('Complete error in getProfile:', {
      errorType: typeof error,
      errorConstructor: error?.constructor?.name,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      errorObject: error,
      address: address,
      timestamp: new Date().toISOString(),
    });
    return null;
  }
}

export async function upsertProfile(profile: Record<string, unknown> & { address: string }): Promise<Profile> {
  const response = await fetch('/api/profile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profile),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || 'Failed to save profile');
  }

  const body = await response.json();
  return body.profile as Profile;
}

export interface WalletLinkProof {
  address: string;
  nostrPublicKey: string;
  walletType: string;
  walletSignature: string;
  walletPublicKey?: string;
  proofMessage: string;
  proofTimestamp: string;
}

export async function createWalletLinkProof(proof: WalletLinkProof): Promise<void> {
  const response = await fetch('/api/profile/link', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(proof),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || 'Failed to save wallet proof');
  }
}

export async function updateProfileField(address: string, field: keyof Profile, value: unknown): Promise<void> {
  try {
    // First, find existing profile with case-insensitive search
    const { data: existingProfiles } = await supabase
      .from('profiles')
      .select('id')
      .ilike('address', address);

    if (!existingProfiles || existingProfiles.length === 0) {
      throw new Error('Profile not found');
    }

    // Update the existing profile
    const { error } = await supabase
      .from('profiles')
      .update({ 
        [field]: value,
        last_active: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', existingProfiles[0].id);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error updating profile field:', error);
    throw error;
  }
}

export async function getProfileStats(address: string) {
  try {
    const { data, error } = await supabase
      .from('profile_stats')
      .select('*')
      .eq('address', address)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching profile stats:', error);
    throw error;
  }
}

export async function searchProfiles(query: string, limit: number = 10) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('address, username, display_name, avatar_url, tagline, creator_verified, verified_artist')
      .or(`username.ilike.%${query}%, display_name.ilike.%${query}%`)
      .eq('account_status', 'active')
      .eq('profile_public', true)
      .limit(limit);
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error searching profiles:', error);
    throw error;
  }
}

export async function getSkillCategories() {
  return [
    {
      category: 'Languages',
      skills: ['JavaScript', 'TypeScript', 'Rust', 'Python', 'Go', 'C++'],
    },
    {
      category: 'Bitcoin Stack',
      skills: ['Bitcoin Core', 'LND', 'BDK', 'Electrum', 'Ordinals', 'Lightning Network', 'Stacks', 'Rootstock'],
    },
    {
      category: 'Frameworks',
      skills: ['React', 'Next.js', 'Node.js', 'Express', 'Actix', 'Rocket'],
    },
    {
      category: 'DevOps Tools',
      skills: ['Docker', 'Kubernetes', 'GitHub Actions', 'GitLab CI', 'Terraform'],
    },
  ];
}

// User Collections
export async function getUserCollections(address: string) {
  try {
    const { data, error } = await supabase
      .from('user_collections')
      .select('*')
      .eq('user_address', address)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching user collections:', error);
    throw error;
  }
}

export async function createCollection(collection: {
  user_address: string;
  name: string;
  description?: string;
  cover_image_url?: string;
  is_public?: boolean;
}) {
  try {
    const { data, error } = await supabase
      .from('user_collections')
      .insert([collection])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating collection:', error);
    throw error;
  }
}

// User Favorites
export async function toggleFavorite(userAddress: string, nftContractId: string, tokenId: number) {
  try {
    // Check if already favorited
    const { data: existing } = await supabase
      .from('user_favorites')
      .select('id')
      .eq('user_address', userAddress)
      .eq('nft_contract_id', nftContractId)
      .eq('token_id', tokenId)
      .single();

    if (existing) {
      // Remove favorite
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('id', existing.id);
      
      if (error) throw error;
      return false; // Unfavorited
    } else {
      // Add favorite
      const { error } = await supabase
        .from('user_favorites')
        .insert([{
          user_address: userAddress,
          nft_contract_id: nftContractId,
          token_id: tokenId
        }]);
      
      if (error) throw error;
      return true; // Favorited
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    throw error;
  }
}

// User Following
export async function followUser(followerAddress: string, followingAddress: string) {
  try {
    const { data, error } = await supabase
      .from('user_follows')
      .insert([{
        follower_address: followerAddress,
        following_address: followingAddress
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error following user:', error);
    throw error;
  }
}

export async function unfollowUser(followerAddress: string, followingAddress: string) {
  try {
    const { error } = await supabase
      .from('user_follows')
      .delete()
      .eq('follower_address', followerAddress)
      .eq('following_address', followingAddress);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error unfollowing user:', error);
    throw error;
  }
}
