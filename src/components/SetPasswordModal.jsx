import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';

function safeMessage(error) {
  if (!error) return '';
  if (typeof error === 'string') return error;
  return error.message || '操作失败，请稍后重试';
}

export default function SetPasswordModal({ isOpen, accessToken, refreshToken, mode, onDone }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const title = useMemo(() => {
    if (mode === 'invite') return '设置密码';
    if (mode === 'recovery') return '重置密码';
    return '设置密码';
  }, [mode]);

  const subtitle = useMemo(() => {
    if (mode === 'invite') return '欢迎加入 WhereToGO';
    if (mode === 'recovery') return '请设置一个新密码';
    return '请设置密码继续';
  }, [mode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!password || password.length < 6) {
      setError('密码至少 6 位');
      return;
    }
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    if (!accessToken || !refreshToken) {
      setError('链接信息缺失，请重新获取邀请邮件后再试');
      return;
    }

    setIsLoading(true);

    const { error: setSessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (setSessionError) {
      setIsLoading(false);
      setError(safeMessage(setSessionError));
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setIsLoading(false);
      setError(safeMessage(updateError));
      return;
    }

    setIsLoading(false);
    setPassword('');
    setConfirmPassword('');
    onDone?.();
  };

  const close = () => {
    if (isLoading) return;
    onDone?.();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(5px)',
            zIndex: 100001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            boxSizing: 'border-box',
          }}
          onClick={close}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ duration: 0.35, type: 'spring', damping: 25, stiffness: 300 }}
            style={{
              background: 'linear-gradient(135deg, #F6BEC8 0%, #E8A5B8 100%)',
              borderRadius: '20px',
              padding: '34px',
              width: '420px',
              maxWidth: '92vw',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.button
              onClick={close}
              disabled={isLoading}
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                color: '#3D3B4F',
                transition: 'all 0.3s ease',
              }}
              whileHover={isLoading ? undefined : { background: 'rgba(255, 255, 255, 0.3)', scale: 1.06 }}
              whileTap={isLoading ? undefined : { scale: 0.96 }}
            >
              ×
            </motion.button>

            <div style={{ textAlign: 'center', marginBottom: '22px' }}>
              <h2 style={{ fontSize: '1.9rem', fontWeight: 'bold', color: '#3D3B4F', margin: 0 }}>{title}</h2>
              <p style={{ fontSize: '0.98rem', color: 'rgba(61, 59, 79, 0.8)', margin: '10px 0 0' }}>
                {subtitle}
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500, color: '#3D3B4F' }}>
                  新密码
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="至少 6 位"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    background: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '1rem',
                    color: '#3D3B4F',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    boxSizing: 'border-box',
                  }}
                  autoComplete="new-password"
                  required
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500, color: '#3D3B4F' }}>
                  确认密码
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再输入一次"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    background: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '1rem',
                    color: '#3D3B4F',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    boxSizing: 'border-box',
                  }}
                  autoComplete="new-password"
                  required
                />
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    style={{
                      background: 'rgba(220, 53, 69, 0.1)',
                      border: '1px solid rgba(220, 53, 69, 0.3)',
                      borderRadius: '8px',
                      padding: '10px',
                      marginBottom: '16px',
                      color: '#dc3545',
                      fontSize: '0.9rem',
                      textAlign: 'center',
                    }}
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                type="submit"
                disabled={isLoading || !password || !confirmPassword}
                whileHover={isLoading ? undefined : { scale: 1.02 }}
                whileTap={isLoading ? undefined : { scale: 0.98 }}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: isLoading || !password || !confirmPassword
                    ? 'rgba(61, 59, 79, 0.5)'
                    : 'linear-gradient(135deg, #3D3B4F 0%, #5D5A6F 100%)',
                  color: 'white',
                  fontSize: '1.05rem',
                  fontWeight: 'bold',
                  cursor: isLoading || !password || !confirmPassword ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                }}
              >
                {isLoading ? '处理中...' : '确认'}
              </motion.button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

