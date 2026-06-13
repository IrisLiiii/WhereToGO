import { useState, useEffect, useCallback } from 'react';
import Story from './pages/Story';
import End from './pages/End';
import CityDetail from './pages/CityDetail';
import EnergyStation from './pages/EnergyStation';
import { EnergyProvider } from './context/EnergyContext';
import { useAuth } from './context/AuthContext';
import StarshipWidget from './components/game/StarshipWidget';
import Navbar from './components/Navbar';
import AccountBadge from './components/AccountBadge';
import LoginModal from './components/LoginModal';
import SetPasswordModal from './components/SetPasswordModal';
import KeywordsParticle from './components/KeywordsParticle';
import PinkAnimationHome from './components/PinkAnimationHome';
import FirstsTimeline from './components/firsts/FirstsTimeline';
import HeroSection from './components/HeroSection';
import LettersModule from './components/letters/LettersModule';
import LettersIcon from './components/letters/LettersIcon';
import MusicPlayer from './components/MusicPlayer';

function parseHashParams() {
  const raw = (window.location.hash || '').replace(/^#/, '');
  if (!raw) return {};

  return raw.split('&').reduce((acc, part) => {
    const [k, v] = part.split('=');
    if (!k) return acc;
    acc[decodeURIComponent(k)] = decodeURIComponent(v || '');
    return acc;
  }, {});
}

function clearHash() {
  const url = window.location.pathname + window.location.search;
  window.history.replaceState(null, '', url);
}

function LoadingScreen() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at top, #1f2a44 0%, #0a0f1a 55%, #05070d 100%)',
        color: '#fff',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '1.8rem', marginBottom: '12px' }}>WhereToGO</div>
        <div style={{ opacity: 0.7, letterSpacing: '0.08em' }}>loading your shared memory space...</div>
      </div>
    </div>
  );
}

function PublicLanding({ onOpenLogin }) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundImage: `linear-gradient(rgba(8, 12, 20, 0.45), rgba(8, 12, 20, 0.7)), url(${import.meta.env.BASE_URL}images/Background.jpg)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: '#fff',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.16) 0, rgba(255,255,255,0) 30%), radial-gradient(circle at 80% 30%, rgba(246,190,200,0.16) 0, rgba(246,190,200,0) 28%)',
        }}
      />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            maxWidth: '680px',
            textAlign: 'center',
            padding: '40px 32px',
            borderRadius: '28px',
            background: 'rgba(8, 12, 20, 0.35)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 20px 80px rgba(0, 0, 0, 0.25)',
          }}
        >
          <div style={{ fontSize: 'clamp(2.6rem, 8vw, 5rem)', fontWeight: 700, letterSpacing: '0.08em' }}>
            WhereToGO
          </div>
          <p
            style={{
              margin: '18px auto 0',
              maxWidth: '540px',
              lineHeight: 1.8,
              fontSize: '1rem',
              color: 'rgba(255, 255, 255, 0.82)',
            }}
          >
            where our travels become our shared memories. every picture, every place, every heartbeat
            along the way waits here, quietly asking: to where next?
          </p>
          <div
            style={{
              marginTop: '28px',
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              onClick={onOpenLogin}
              style={{
                border: 'none',
                borderRadius: '999px',
                padding: '14px 28px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                color: '#1a1320',
                background: 'linear-gradient(135deg, #f6bec8 0%, #fad0c4 100%)',
                boxShadow: '0 10px 30px rgba(246, 190, 200, 0.28)',
              }}
            >
              登录进入
            </button>
            <div
              style={{
                padding: '14px 20px',
                borderRadius: '999px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                fontSize: '0.95rem',
                color: 'rgba(255,255,255,0.78)',
              }}
            >
              仅限被邀请成员访问完整内容
            </div>
          </div>
        </div>
      </div>
      <MusicPlayer />
    </div>
  );
}

function AuthenticatedApp() {
  const [page, setPage] = useState('home');
  const [selectedCity, setSelectedCity] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activeTab, setActiveTab] = useState('towhere');
  const [showMobileNotice, setShowMobileNotice] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // If we are on keywords and switch to mobile, move to towhere
      if (mobile && activeTab === 'keywords') {
        setActiveTab('towhere');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTab]);

  // Sync tab state with URL hash for reload persistence
  useEffect(() => {
    // 1. Handle Pathname for direct city links (e.g. /city/珠海)
    const path = decodeURIComponent(window.location.pathname);
    if (path.startsWith('/city/')) {
      const cityName = path.replace('/city/', '');
      if (cityName) {
        setSelectedCity(cityName);
        setPage('city');
      }
    }

    // 2. Handle Hash for tabs
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (['keywords', 'towhere', 'breaking', 'letters'].includes(hash)) {
        // Prevent keyboards on mobile
        if (isMobile && hash === 'keywords') {
          setTabWithHash('towhere');
        } else {
          setActiveTab(hash);
        }
      }
    };

    // Initial load
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isMobile]);

  const setTabWithHash = useCallback((tab) => {
    window.location.hash = tab;
    setActiveTab(tab);
  }, []);

  const handleSetTab = useCallback((tab) => {
    setTabWithHash(tab);
  }, [setTabWithHash]);

  const goTo = useCallback((p) => setPage(p), []);

  const goToCity = useCallback((cityName) => {
    setSelectedCity(cityName);
    setPage('city');
  }, []);

  const goBackToGlobe = useCallback(() => {
    setSelectedCity(null);
    setPage('home');
    handleSetTab('towhere');
  }, [handleSetTab]);

  return (
    <EnergyProvider>
        <div style={{ width: '100%', height: '100%', margin: 0, padding: 0 }}>
          <AccountBadge placement="bottom-left" />
          {/* Mobile Notice Modal */}
          {showMobileNotice && isMobile && (
            <div style={{
              position: 'fixed',
              inset: 0,
              zIndex: 200000,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(20px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '24px',
                padding: '40px 30px',
                textAlign: 'center',
                maxWidth: '320px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                animation: 'modalIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
              }}>
                <style>{`
                  @keyframes modalIn {
                    from { opacity: 0; transform: scale(0.9) translateY(20px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                  }
                `}</style>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>📱</div>
                <p style={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '16px',
                  lineHeight: '1.6',
                  marginBottom: '30px',
                  fontWeight: '300'
                }}>
                  手机端APP仍在开发中，<br />
                  当前版本只展示部分功能。<br />
                  想体验完整功能用电脑打开哦～
                </p>
                <button
                  onClick={() => setShowMobileNotice(false)}
                  style={{
                    background: 'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)',
                    border: 'none',
                    borderRadius: '50px',
                    padding: '12px 40px',
                    color: '#000',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 10px 20px rgba(255, 154, 158, 0.3)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                  onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                >
                  我知道了
                </button>
              </div>
            </div>
          )}

          {/* Render home view if page is home OR city, to keep globe mounted */}
          {(page === 'home' || page === 'city') && (
            <div style={{ display: page === 'city' ? 'none' : 'block', width: '100%', height: '100%' }}>
              {!isMobile && (
                <>
                  <Navbar
                    activeTab={activeTab}
                    setTab={handleSetTab}
                    isMobile={isMobile}
                    isDarkMode={['letters'].includes(activeTab)}
                  />
                  <LettersIcon
                    onClick={() => handleSetTab('letters')}
                    active={activeTab === 'letters'}
                    isDarkMode={['letters'].includes(activeTab)}
                  />
                </>
              )}

              {isMobile && page === 'home' && (activeTab === 'towhere' || activeTab === 'breaking') && (
                <div
                  className="mobile-tab-toggle"
                  onClick={() => handleSetTab(activeTab === 'towhere' ? 'breaking' : 'towhere')}
                  style={{
                    position: 'fixed',
                    top: '20px',
                    left: '20px',
                    zIndex: 100000,
                    width: '40px',
                    height: '40px',
                    background: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(8px)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12l5 5 5-5M22 12l-5-5-5 5" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                  </svg>
                </div>
              )}

              <div className="page-content">
                {activeTab === 'keywords' && !isMobile && (
                  <div style={{
                    position: 'relative',
                    width: '100%',
                    height: '100vh',
                    overflow: 'hidden',
                    backgroundImage: `url(${import.meta.env.BASE_URL}images/Background.jpg)`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}>
                    {/* KeywordsParticle handles its own layering: Canvas at lowest, UI at highest */}
                    <KeywordsParticle />

                    {/* Middle layer: Interactive planets */}
                    <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
                      <HeroSection goTo={goTo} />
                    </div>
                  </div>
                )}
                {activeTab === 'towhere' && <PinkAnimationHome goTo={goTo} goToCity={goToCity} isCityMode={page === 'city'} isMobile={isMobile} />}
                {activeTab === 'breaking' && <FirstsTimeline />}
                {activeTab === 'letters' && !isMobile && <LettersModule />}
              </div>
              {activeTab === 'keywords' && !isMobile && (
                <StarshipWidget />
              )}
            </div>
          )}

          {page === 'story' && <Story goTo={goTo} />}
          {page === 'end' && <End goTo={goTo} />}

          {/* CityDetail renders on top, Globe continues to exist hidden */}
          {page === 'city' && selectedCity && (
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100%', zIndex: 9999, background: 'linear-gradient(135deg, #0a0f1a 0%, #0d1525 40%, #111d35 100%)' }}>
              <CityDetail cityName={selectedCity} goBack={goBackToGlobe} />
            </div>
          )}

          {page === 'annual' && <EnergyStation goTo={goTo} />}
          <MusicPlayer />
        </div>
      </EnergyProvider>
  );
}

export default function App() {
  const { loading, user } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [authLink, setAuthLink] = useState(() => parseHashParams());

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    const errorCode = authLink.error_code || authLink.error;
    const shouldSetPassword =
      (authLink.type === 'invite' || authLink.type === 'recovery') &&
      !!authLink.access_token &&
      !!authLink.refresh_token;

    return (
      <>
        <PublicLanding onOpenLogin={() => setShowLoginModal(true)} />
        {errorCode === 'otp_expired' && (
          <div
            style={{
              position: 'fixed',
              left: '50%',
              transform: 'translateX(-50%)',
              bottom: '18px',
              zIndex: 100003,
              background: 'rgba(8, 12, 20, 0.7)',
              border: '1px solid rgba(255,255,255,0.14)',
              color: 'rgba(255,255,255,0.9)',
              padding: '12px 16px',
              borderRadius: '14px',
              maxWidth: '92vw',
              backdropFilter: 'blur(14px)',
              boxShadow: '0 18px 60px rgba(0,0,0,0.3)',
              lineHeight: 1.6,
            }}
          >
            邮件链接已失效或已过期，请回到 Supabase 后台重新发送邀请邮件后再打开新链接。
          </div>
        )}
        <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
        <SetPasswordModal
          isOpen={shouldSetPassword}
          accessToken={authLink.access_token}
          refreshToken={authLink.refresh_token}
          mode={authLink.type}
          onDone={() => {
            clearHash();
            setAuthLink({});
          }}
        />
      </>
    );
  }

  return <AuthenticatedApp />;
}
