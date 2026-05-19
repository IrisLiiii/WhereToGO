import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

function normalizeName(input) {
  const name = (input || '').trim();
  if (!name) return '';
  return name.slice(0, 24);
}

export default function AccountBadge({ placement = 'bottom-left' }) {
  const { user, profile, profileLoading, signOut, updateDisplayName } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const displayName = useMemo(() => {
    const fromProfile = normalizeName(profile?.display_name);
    if (fromProfile) return fromProfile;
    const fromMeta = normalizeName(user?.user_metadata?.display_name);
    if (fromMeta) return fromMeta;
    const fromEmail = (user?.email || '').split('@')[0] || '';
    return normalizeName(fromEmail) || '我';
  }, [profile?.display_name, user?.email, user?.user_metadata?.display_name]);

  const containerStyle = useMemo(() => {
    const base = {
      position: 'fixed',
      zIndex: 100002,
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '10px 14px',
      borderRadius: '999px',
      background: 'rgba(8, 12, 20, 0.48)',
      border: '1px solid rgba(255,255,255,0.12)',
      backdropFilter: 'blur(12px)',
      color: '#fff',
    };

    if (placement === 'top-left') return { ...base, top: '16px', left: '16px' };
    if (placement === 'top-right') return { ...base, top: '16px', right: '16px' };
    if (placement === 'bottom-right') return { ...base, bottom: '16px', right: '16px' };
    return { ...base, bottom: '16px', left: '16px' };
  }, [placement]);

  const openEdit = () => {
    setError('');
    setDraftName(profile?.display_name || '');
    setIsEditing(true);
  };

  const closeEdit = () => {
    if (saving) return;
    setIsEditing(false);
    setError('');
  };

  const handleSave = async () => {
    setError('');
    const next = normalizeName(draftName);
    if (!next) {
      setError('请输入昵称');
      return;
    }

    setSaving(true);
    const { error: updateError } = await updateDisplayName(next);
    setSaving(false);

    if (updateError) {
      setError(updateError.message || '保存失败');
      return;
    }

    setIsEditing(false);
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    const { error: signOutError } = await signOut();
    if (signOutError) {
      console.error('Failed to sign out:', signOutError);
    }
    setSigningOut(false);
  };

  return (
    <>
      <div style={containerStyle}>
        <button
          type="button"
          onClick={openEdit}
          style={{
            border: 'none',
            background: 'transparent',
            padding: 0,
            cursor: 'pointer',
            color: '#fff',
            maxWidth: '180px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontSize: '0.95rem',
            fontWeight: 600,
            opacity: profileLoading ? 0.7 : 1,
          }}
          title="点击修改昵称"
        >
          {displayName}
        </button>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          style={{
            border: 'none',
            borderRadius: '999px',
            padding: '8px 12px',
            cursor: signingOut ? 'not-allowed' : 'pointer',
            background: 'rgba(255,255,255,0.14)',
            color: '#fff',
            fontSize: '0.9rem',
          }}
        >
          {signingOut ? '退出中...' : '退出'}
        </button>
      </div>

      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100003,
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              boxSizing: 'border-box',
            }}
            onClick={closeEdit}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 16 }}
              transition={{ duration: 0.25, type: 'spring', damping: 25, stiffness: 300 }}
              style={{
                width: '420px',
                maxWidth: '92vw',
                borderRadius: '18px',
                background: 'rgba(8, 12, 20, 0.92)',
                border: '1px solid rgba(255,255,255,0.14)',
                boxShadow: '0 30px 90px rgba(0,0,0,0.35)',
                padding: '18px',
                color: '#fff',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>设置昵称</div>
                <button
                  type="button"
                  onClick={closeEdit}
                  disabled={saving}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'rgba(255,255,255,0.8)',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: '1.3rem',
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{ fontSize: '0.9rem', opacity: 0.75, marginBottom: '10px' }}>
                将显示在页面角落和后续记录归属中
              </div>

              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="例如：小肴 / Iris / 宝宝"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.14)',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#fff',
                  outline: 'none',
                  fontSize: '1rem',
                }}
                autoFocus
              />

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      marginTop: '10px',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      background: 'rgba(220, 53, 69, 0.12)',
                      border: '1px solid rgba(220, 53, 69, 0.25)',
                      color: 'rgba(255,255,255,0.9)',
                      fontSize: '0.9rem',
                    }}
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                <button
                  type="button"
                  onClick={closeEdit}
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.14)',
                    background: 'rgba(255,255,255,0.06)',
                    color: '#fff',
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #f6bec8 0%, #fad0c4 100%)',
                    color: '#1a1320',
                    fontWeight: 700,
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

