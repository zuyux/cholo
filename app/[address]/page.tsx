'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';
import { Camera, LoaderCircle, User } from 'lucide-react';
import { useWallet } from '@/components/WalletProvider';
import { getProfile, Profile } from '@/lib/profileApi';
import { getIPFSUrl } from '@/lib/pinataUpload';

const AVATAR_SIZE = 90;

async function resizeAvatar(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    const cropSize = Math.min(bitmap.width, bitmap.height);
    const sourceX = (bitmap.width - cropSize) / 2;
    const sourceY = (bitmap.height - cropSize) / 2;
    const canvas = document.createElement('canvas');
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Your browser could not resize this image.');

    context.drawImage(
      bitmap,
      sourceX,
      sourceY,
      cropSize,
      cropSize,
      0,
      0,
      AVATAR_SIZE,
      AVATAR_SIZE,
    );

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => result ? resolve(result) : reject(new Error('Image resize failed.')),
        'image/webp',
        0.85,
      );
    });

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'avatar';
    return new File([blob], `${baseName}-90.webp`, { type: 'image/webp' });
  } finally {
    bitmap.close();
  }
}

export default function AddressPage() {
  const params = useParams();
  const { address: connectedAddress } = useWallet();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingAvatar, setLoadingAvatar] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [editingUsername, setEditingUsername] = useState(false);
  const [username, setUsername] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const address =
    params && typeof params.address === 'string'
      ? params.address
      : params && Array.isArray(params.address)
      ? params.address[0]
      : null;

  const isOwner = Boolean(
    address && connectedAddress && address.toLowerCase() === connectedAddress.toLowerCase()
  );

  useEffect(() => {
    if (!address) return;
    setLoadingProfile(true);
    getProfile(address)
      .then(setProfile)
      .finally(() => setLoadingProfile(false));
  }, [address]);

  useEffect(() => {
    if (editingUsername) usernameInputRef.current?.focus();
  }, [editingUsername]);

  const startEditingUsername = () => {
    if (!isOwner || savingUsername) return;
    setUsername(profile?.username || '');
    setUsernameError(null);
    setEditingUsername(true);
  };

  const saveUsername = async () => {
    if (!address || !isOwner || savingUsername) return;

    setSavingUsername(true);
    setUsernameError(null);
    try {
      const response = await fetch(`/api/profile/${encodeURIComponent(address)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || 'Failed to update username.');

      const refreshedProfile = await getProfile(address);
      setProfile(refreshedProfile || result.profile);
      setEditingUsername(false);
    } catch (error) {
      setUsernameError(error instanceof Error ? error.message : 'Failed to update username.');
    } finally {
      setSavingUsername(false);
    }
  };

  const handleAvatarSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !address || !isOwner) return;

    setUploading(true);
    setUploadError(null);
    try {
      const resizedFile = await resizeAvatar(file);
      const formData = new FormData();
      formData.append('file', resizedFile);
      formData.append('address', address);
      if (profile?.avatar_cid) formData.append('oldCid', profile.avatar_cid);

      const response = await fetch('/api/profile/avatar', { method: 'POST', body: formData });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Upload failed.');

      setProfile((current) => ({
        ...(current || { address }),
        avatar_cid: result.cid,
        avatar_url: result.avatarUrl,
      }));
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to upload profile picture.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const avatarUrl = profile?.avatar_cid
    ? getIPFSUrl(profile.avatar_cid)
    : profile?.avatar_url;

  useEffect(() => {
    setLoadingAvatar(Boolean(avatarUrl));
  }, [avatarUrl]);

  if (!address) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh]'>
        <div className='bg-[#333] rounded-full h-24 w-24 flex items-center justify-center mb-8'></div>
        <h2 className='text-2xl mb-2'>Perfil</h2>
        <p className='text-sm text-[#777]'>No se proporcionó ninguna dirección.</p>
      </div>
    );
  }

  return (
    <div className='mx-auto w-full px-8 pt-36 pb-36'>
      <div className='text-center items-center justify-center'>
        <div className='mx-auto'>
          <button
            type="button"
            onClick={() => isOwner && !uploading && fileInputRef.current?.click()}
            disabled={!isOwner || uploading}
            aria-label={isOwner ? 'Upload profile picture' : 'Profile picture'}
            className={`group relative mx-auto my-8 bg-transparent border border-[#333] rounded-full h-24 w-24 select-none overflow-hidden flex items-center justify-center ${isOwner ? 'cursor-pointer' : 'cursor-default'}`}
          >
            {loadingProfile || uploading ? (
              <LoaderCircle className="animate-spin text-white" size={28} />
            ) : avatarUrl ? (
              <>
                {loadingAvatar && (
                  <LoaderCircle className="absolute animate-spin text-white" size={28} />
                )}
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className={`h-full w-full object-cover transition-opacity ${loadingAvatar ? 'opacity-0' : 'opacity-100'}`}
                  onLoad={() => setLoadingAvatar(false)}
                  onError={() => setLoadingAvatar(false)}
                />
              </>
            ) : (
              <User className="h-12 w-12 text-white/50" />
            )}
            {isOwner && !uploading && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="text-white" size={24} />
              </span>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleAvatarSelect}
            className="hidden"
          />
        </div>
        <h2 className='text-4xl mt-8 text-gray-700'></h2>
        <div className='mt-4 mb-8 flex min-h-8 items-center justify-center'>
          {editingUsername ? (
            <input
              ref={usernameInputRef}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void saveUsername();
                if (event.key === 'Escape') setEditingUsername(false);
              }}
              disabled={savingUsername}
              maxLength={30}
              aria-label='Username'
              placeholder='username'
              className='w-64 border-b border-[#777] bg-transparent px-2 py-1 text-center text-sm text-[#777] outline-none focus:border-white disabled:opacity-60'
            />
          ) : (
            <p
              onClick={startEditingUsername}
              title={isOwner ? 'Click to edit username' : undefined}
              className={`text-sm text-[#777] ${isOwner ? 'cursor-pointer hover:underline' : ''}`}
            >
              {profile?.username ? `@${profile.username}` : address}
            </p>
          )}
          {savingUsername && <LoaderCircle className='ml-2 animate-spin text-[#777]' size={16} />}
        </div>
        <p>{isOwner && <span className="text-green-500 font-semibold select-none">•</span>}</p>
        <Link
          href='/#gallery'
          className='mt-6 inline-flex cursor-pointer items-center justify-center rounded-lg bg-[#b7132f] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#951027]'
        >
          Compra un Avatar CHOLO
        </Link>
        {uploadError && <p className="mt-3 text-sm text-red-400">{uploadError}</p>}
        {usernameError && <p className="mt-3 text-sm text-red-400">{usernameError}</p>}
      </div>
    </div>
  );
}
