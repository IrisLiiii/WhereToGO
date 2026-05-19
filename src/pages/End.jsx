import React from 'react';

export default function End({ goTo }) {
  return (
    <div style={{ textAlign: 'center', minHeight: '100vh', background: '#f9f6f2' }}>
      <h2 style={{ marginTop: 40, fontSize: 30 }}>我们就这样往前走着，一起经历过的那些，以及此刻的陪伴，对我们来说都是非常珍贵的礼物</h2>
      <p style={{ fontSize: 20, margin: '30px 0 40px' }}>嘿，我们走着瞧 </p>
      <button onClick={() => goTo('home')} style={{ marginTop: 40, fontSize: 18, padding: '10px 30px', borderRadius: 8, background: '#4f8cff', color: '#fff', border: 'none', cursor: 'pointer' }}>
        回到首页
      </button>
    </div>
  );
} 