import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

function normalizeName(input) {
  const name = (input || '').trim();
  if (!name) return '';
  return name.slice(0, 24);
}

const FONT_OPTIONS = [
  {
    key: 'system',
    label: '默认（系统）',
    fontFamily: "'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', Arial, sans-serif",
  },
  {
    key: 'notoSerif',
    label: 'Noto Serif SC（衬线）',
    fontFamily: "'Noto Serif SC', 'PingFang SC', serif",
  },
  {
    key: 'zcool',
    label: 'ZCOOL XiaoWei（古风）',
    fontFamily: "'ZCOOL XiaoWei', 'PingFang SC', serif",
  },
  {
    key: 'mashan',
    label: 'Ma Shan Zheng（手写）',
    fontFamily: "'Ma Shan Zheng', 'PingFang SC', cursive",
  },
  {
    key: 'rajdhani',
    label: 'Rajdhani（科幻）',
    fontFamily: "'Rajdhani', 'PingFang SC', sans-serif",
  },
  {
    key: 'orbitron',
    label: 'Orbitron（硬核科幻）',
    fontFamily: "'Orbitron', 'Rajdhani', sans-serif",
  },
];

function applyFontFamily(fontFamily) {
  if (!fontFamily) return;
  document.documentElement.style.setProperty('--app-font', fontFamily);
}

function persistFontFamily(fontFamily) {
  if (!fontFamily) return;
  document.documentElement.style.setProperty('--app-font', fontFamily);
  localStorage.setItem('wheretogo:fontFamily', fontFamily);
}

export default function AccountBadge({ placement = 'bottom-left' }) {
  const { user, profile, profileLoading, signOut, updateProfile } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [fontKey, setFontKey] = useState(() => {
    const stored = localStorage.getItem('wheretogo:fontFamily');
    if (!stored) return 'system';
    const match = FONT_OPTIONS.find((o) => o.fontFamily === stored);
    return match?.key || 'system';
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const initialFontFamilyRef = useRef(null);

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

  useEffect(() => {
    if (!profile?.font_family) return;
    persistFontFamily(profile.font_family);
    const match = FONT_OPTIONS.find((o) => o.fontFamily === profile.font_family);
    setFontKey(match?.key || 'system');
  }, [profile?.font_family]);

  const openProfile = () => {
    setError('');
    setDraftName(profile?.display_name || '');
    const stored = profile?.font_family || localStorage.getItem('wheretogo:fontFamily');
    const match = stored ? FONT_OPTIONS.find((o) => o.fontFamily === stored) : null;
    const initialFontFamily = match?.fontFamily || FONT_OPTIONS[0].fontFamily;
    initialFontFamilyRef.current = initialFontFamily;
    setFontKey(match?.key || 'system');
    setIsOpen(true);
  };

  const closeProfile = () => {
    if (saving) return;
    setIsOpen(false);
    setError('');
    if (initialFontFamilyRef.current) {
      persistFontFamily(initialFontFamilyRef.current);
    }
  };

  const handleSave = async () => {
    setError('');
    const next = normalizeName(draftName);
    if (!next) {
      setError('请输入昵称');
      return;
    }

    setSaving(true);
    const selected = FONT_OPTIONS.find((o) => o.key === fontKey) || FONT_OPTIONS[0];
    const { error: updateError } = await updateProfile({
      display_name: next,
      font_family: selected.fontFamily,
    });
    setSaving(false);

    if (updateError) {
      setError(updateError.message || '保存失败');
      return;
    }

    persistFontFamily(selected.fontFamily);
    setIsOpen(false);
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
          onClick={openProfile}
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
          title="点击打开个人设置"
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
        {isOpen && (
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
            onClick={closeProfile}
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
                <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>个人主页</div>
                <button
                  type="button"
                  onClick={closeProfile}
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

              <div style={{ fontSize: '0.9rem', opacity: 0.75, marginBottom: '14px', lineHeight: 1.7 }}>
                昵称会显示在页面角落；字体会影响整个网页的显示风格
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.75, marginBottom: '8px' }}>昵称</div>
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
                </div>

                <div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.75, marginBottom: '8px' }}>字体</div>
                  <select
                    value={fontKey}
                    onChange={(e) => {
                      const nextKey = e.target.value;
                      setFontKey(nextKey);
                      const selected = FONT_OPTIONS.find((o) => o.key === nextKey);
                      applyFontFamily(selected?.fontFamily || FONT_OPTIONS[0].fontFamily);
                    }}
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
                      appearance: 'none',
                    }}
                  >
                    {FONT_OPTIONS.map((o) => (
                      <option key={o.key} value={o.key} style={{ color: '#000' }}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

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
                  onClick={closeProfile}
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
