import React, { useMemo, useState } from 'react';
import { useEnergy, USERS } from '../context/EnergyContext';
import CheckInPanel from '../components/energy/CheckInPanel';
import GravityChart from '../components/energy/GravityChart';
import EnergyCalendar from '../components/energy/EnergyCalendar';
import { motion, AnimatePresence } from 'framer-motion';
import PlanetDetailModal from '../components/energy/PlanetDetailModal';

function KeywordManagerSection({ onOpenPlanet }) {
    const {
        currentUser,
        currentYear,
        maxActiveKeywords,
        userInfo,
        archivedKeywordRecordsByUser,
        createKeyword,
        renameKeyword,
        archiveKeyword,
        deleteKeywordPermanently,
        getKeywordCheckins,
        getKeywordTasks
    } = useEnergy();
    const [newKeywordInput, setNewKeywordInput] = useState('');
    const [editingKeywordId, setEditingKeywordId] = useState(null);
    const [editingKeywordValue, setEditingKeywordValue] = useState('');
    const [pendingDeleteKeyword, setPendingDeleteKeyword] = useState(null);
    const [message, setMessage] = useState('');

    const activeKeywordRecords = userInfo.keywordRecords || [];
    const archivedKeywordRecords = archivedKeywordRecordsByUser[currentUser] || [];

    const setFeedback = (text) => {
        setMessage(text);
        window.setTimeout(() => {
            setMessage((current) => (current === text ? '' : current));
        }, 2200);
    };

    const handleCreate = async () => {
        const result = await createKeyword(newKeywordInput, currentUser);
        if (result.ok) {
            setNewKeywordInput('');
            setFeedback('年度关键词已添加');
        } else if (result.message) {
            setFeedback(result.message);
        }
    };

    const handleRenameSave = async () => {
        if (!editingKeywordId) return;
        const result = await renameKeyword(editingKeywordId, editingKeywordValue);
        if (result.ok) {
            setFeedback('关键词名称已更新');
            setEditingKeywordId(null);
            setEditingKeywordValue('');
        } else if (result.message) {
            setFeedback(result.message);
        }
    };

    const handleDeleteAction = async (action) => {
        if (!pendingDeleteKeyword) return;

        if (action === 'rename') {
            setEditingKeywordId(pendingDeleteKeyword.id);
            setEditingKeywordValue(pendingDeleteKeyword.keyword);
            setPendingDeleteKeyword(null);
            return;
        }

        const executor = action === 'archive' ? archiveKeyword : deleteKeywordPermanently;
        const result = await executor(pendingDeleteKeyword.id);
        if (result.ok) {
            setFeedback(action === 'archive' ? '关键词已存档到档案馆' : '关键词及相关历史已删除');
            setPendingDeleteKeyword(null);
        } else if (result.message) {
            setFeedback(result.message);
        }
    };

    const pendingKeywordStats = useMemo(() => {
        if (!pendingDeleteKeyword) return null;
        return {
            checkins: getKeywordCheckins(pendingDeleteKeyword.user_id, pendingDeleteKeyword.keyword).length,
            tasks: getKeywordTasks(pendingDeleteKeyword.user_id, pendingDeleteKeyword.keyword).length
        };
    }, [getKeywordCheckins, getKeywordTasks, pendingDeleteKeyword]);

    return (
        <>
            <section style={{ background: 'rgba(10, 20, 30, 0.5)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
                    <div>
                        <h2 style={{ margin: 0, marginBottom: '10px', borderLeft: '4px solid #4ECDC4', paddingLeft: '10px' }}>年度关键词管理</h2>
                        <div style={{ color: '#8da2bd', fontSize: '14px', lineHeight: 1.7 }}>
                            {userInfo.name} 的 {currentYear} 年度关键词，最多 {maxActiveKeywords} 个。
                        </div>
                    </div>
                    <div style={{ minWidth: '280px', flex: '1 1 320px', maxWidth: '420px' }}>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input
                                value={newKeywordInput}
                                onChange={(e) => setNewKeywordInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCreate();
                                }}
                                placeholder="新增一个年度关键词"
                                style={{
                                    flex: 1,
                                    padding: '12px 14px',
                                    background: 'rgba(0,0,0,0.28)',
                                    border: '1px solid rgba(255,255,255,0.12)',
                                    borderRadius: '10px',
                                    color: '#fff',
                                    outline: 'none',
                                    fontFamily: 'inherit'
                                }}
                            />
                            <button
                                onClick={handleCreate}
                                disabled={activeKeywordRecords.length >= maxActiveKeywords}
                                style={{
                                    border: 'none',
                                    borderRadius: '10px',
                                    padding: '0 18px',
                                    background: activeKeywordRecords.length >= maxActiveKeywords ? '#2d3748' : '#4ECDC4',
                                    color: activeKeywordRecords.length >= maxActiveKeywords ? '#718096' : '#04131a',
                                    fontWeight: 700,
                                    cursor: activeKeywordRecords.length >= maxActiveKeywords ? 'not-allowed' : 'pointer'
                                }}
                            >
                                添加
                            </button>
                        </div>
                    </div>
                </div>

                {message && (
                    <div style={{
                        marginBottom: '16px',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: 'rgba(78, 205, 196, 0.12)',
                        color: '#7be5df',
                        fontSize: '14px'
                    }}>
                        {message}
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                    {activeKeywordRecords.length === 0 && (
                        <div style={{
                            gridColumn: '1 / -1',
                            padding: '22px',
                            borderRadius: '12px',
                            background: 'rgba(255,255,255,0.03)',
                            color: '#8da2bd',
                            textAlign: 'center'
                        }}>
                            还没有年度关键词，先加一颗新的星球吧。
                        </div>
                    )}
                    {activeKeywordRecords.map((record, index) => (
                        <div key={record.id} style={{
                            padding: '18px',
                            borderRadius: '14px',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                                <span style={{ color: '#4ECDC4', fontSize: '12px', letterSpacing: '1px' }}>
                                    KEYWORD {String(index + 1).padStart(2, '0')}
                                </span>
                                <button
                                    onClick={() => onOpenPlanet({ keyword: record.keyword, userId: record.user_id, userName: userInfo.name, status: 'active' })}
                                    style={{
                                        background: 'transparent',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                        borderRadius: '999px',
                                        color: '#cbd5e1',
                                        padding: '4px 10px',
                                        cursor: 'pointer',
                                        fontSize: '12px'
                                    }}
                                >
                                    查看
                                </button>
                            </div>

                            {editingKeywordId === record.id ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <input
                                        value={editingKeywordValue}
                                        onChange={(e) => setEditingKeywordValue(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleRenameSave();
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '12px 14px',
                                            background: 'rgba(0,0,0,0.3)',
                                            border: '1px solid rgba(78,205,196,0.35)',
                                            borderRadius: '10px',
                                            color: '#fff',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button
                                            onClick={handleRenameSave}
                                            style={{ flex: 1, border: 'none', borderRadius: '10px', padding: '10px 12px', background: '#4ECDC4', color: '#04131a', fontWeight: 700, cursor: 'pointer' }}
                                        >
                                            保存名称
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingKeywordId(null);
                                                setEditingKeywordValue('');
                                            }}
                                            style={{ flex: 1, border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 12px', background: 'transparent', color: '#cbd5e1', cursor: 'pointer' }}
                                        >
                                            取消
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div style={{ fontSize: '26px', fontWeight: 700, color: '#fff', marginBottom: '16px' }}>{record.keyword}</div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button
                                            onClick={() => {
                                                setEditingKeywordId(record.id);
                                                setEditingKeywordValue(record.keyword);
                                            }}
                                            style={{ flex: 1, border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 12px', background: 'transparent', color: '#fff', cursor: 'pointer' }}
                                        >
                                            改名
                                        </button>
                                        <button
                                            onClick={() => setPendingDeleteKeyword(record)}
                                            style={{ flex: 1, border: '1px solid rgba(255,107,107,0.35)', borderRadius: '10px', padding: '10px 12px', background: 'rgba(255,107,107,0.08)', color: '#ff9494', cursor: 'pointer' }}
                                        >
                                            删除 / 存档
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            <section style={{ background: 'rgba(10, 20, 30, 0.5)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '18px', gap: '12px', flexWrap: 'wrap' }}>
                    <h2 style={{ margin: 0, borderLeft: '4px solid #FFD93D', paddingLeft: '10px' }}>关键词档案馆</h2>
                    <span style={{ color: '#8da2bd', fontSize: '14px' }}>
                        已存档 {archivedKeywordRecords.length} 个关键词
                    </span>
                </div>

                {archivedKeywordRecords.length === 0 ? (
                    <div style={{ padding: '16px 0', color: '#8da2bd' }}>
                        暂时还没有存档关键词。以后删除有历史的关键词时，可以把它存到这里留作纪念。
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px' }}>
                        {archivedKeywordRecords.map((record) => {
                            const historyCount = getKeywordCheckins(record.user_id, record.keyword).length;
                            const taskCount = getKeywordTasks(record.user_id, record.keyword).length;

                            return (
                                <motion.button
                                    key={record.id}
                                    whileHover={{ y: -4 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => onOpenPlanet({ keyword: record.keyword, userId: record.user_id, userName: userInfo.name, status: 'archived' })}
                                    style={{
                                        textAlign: 'left',
                                        padding: '18px',
                                        borderRadius: '14px',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        background: 'rgba(255,255,255,0.03)',
                                        color: '#fff',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
                                        <span style={{ color: '#FFD93D', fontSize: '12px', letterSpacing: '1px' }}>ARCHIVED</span>
                                        <span style={{ color: '#718096', fontSize: '12px' }}>{record.year}</span>
                                    </div>
                                    <div style={{ fontSize: '22px', fontWeight: 700, marginBottom: '10px' }}>{record.keyword}</div>
                                    <div style={{ color: '#a0aec0', fontSize: '13px', lineHeight: 1.7 }}>
                                        历史打卡 {historyCount} 条
                                        <br />
                                        子任务 {taskCount} 条
                                    </div>
                                </motion.button>
                            );
                        })}
                    </div>
                )}
            </section>

            <AnimatePresence>
                {pendingDeleteKeyword && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 3000,
                            background: 'rgba(0, 0, 0, 0.78)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '20px'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.94, y: 16 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.94, y: 16 }}
                            style={{
                                width: 'min(560px, 94vw)',
                                borderRadius: '18px',
                                background: '#0a0f18',
                                border: '1px solid rgba(255,255,255,0.1)',
                                padding: '24px'
                            }}
                        >
                            <div style={{ fontSize: '26px', fontWeight: 700, color: '#fff', marginBottom: '10px' }}>
                                处理关键词“{pendingDeleteKeyword.keyword}”
                            </div>
                            <div style={{ color: '#8da2bd', lineHeight: 1.8, marginBottom: '18px' }}>
                                这个关键词当前有历史内容：打卡 {pendingKeywordStats?.checkins || 0} 条，子任务 {pendingKeywordStats?.tasks || 0} 条。
                                你可以选择全部删除、存档，或者改名后继续保留。
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginBottom: '18px' }}>
                                <button
                                    onClick={() => handleDeleteAction('delete')}
                                    style={{ border: '1px solid rgba(255,107,107,0.4)', borderRadius: '12px', padding: '14px 16px', background: 'rgba(255,107,107,0.08)', color: '#ff9494', cursor: 'pointer', textAlign: 'left' }}
                                >
                                    全部删除
                                    <div style={{ fontSize: '12px', color: '#fbb6b6', marginTop: '4px' }}>关键词、历史记录、子任务全部移除</div>
                                </button>
                                <button
                                    onClick={() => handleDeleteAction('archive')}
                                    style={{ border: '1px solid rgba(255,209,102,0.35)', borderRadius: '12px', padding: '14px 16px', background: 'rgba(255,209,102,0.08)', color: '#ffe08a', cursor: 'pointer', textAlign: 'left' }}
                                >
                                    存档
                                    <div style={{ fontSize: '12px', color: '#f6e05e', marginTop: '4px' }}>从本年度关键词和星球中移除，但保留到档案馆</div>
                                </button>
                                <button
                                    onClick={() => handleDeleteAction('rename')}
                                    style={{ border: '1px solid rgba(78,205,196,0.35)', borderRadius: '12px', padding: '14px 16px', background: 'rgba(78,205,196,0.08)', color: '#7be5df', cursor: 'pointer', textAlign: 'left' }}
                                >
                                    仅改名
                                    <div style={{ fontSize: '12px', color: '#81e6d9', marginTop: '4px' }}>只改变关键词名称，其他内容全部继承</div>
                                </button>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => setPendingDeleteKeyword(null)}
                                    style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 16px', background: 'transparent', color: '#cbd5e1', cursor: 'pointer' }}
                                >
                                    取消
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

function EnergyStationContent({ goHome }) {
    const { currentUser, setCurrentUser, userInfo } = useEnergy();
    const [selectedPlanet, setSelectedPlanet] = useState(null);

    return (
        <div style={{
            height: '100vh',
            background: '#050B14',
            color: '#E0E6ED',
            fontFamily: '"Rajdhani", sans-serif',
            padding: '20px',
            boxSizing: 'border-box',
            overflowX: 'hidden',
            overflowY: 'auto'
        }}>
            {/* Header */}
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '40px',
                borderBottom: '1px solid rgba(78, 205, 196, 0.3)',
                paddingBottom: '20px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <button onClick={goHome} style={{
                        background: 'transparent', border: '1px solid #4ECDC4', color: '#4ECDC4',
                        padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit', textTransform: 'uppercase'
                    }}>
                        &lt; Back to Orbit
                    </button>
                    <h1 style={{ margin: 0, fontSize: '24px', letterSpacing: '2px', textTransform: 'uppercase', textShadow: '0 0 10px rgba(78, 205, 196, 0.5)' }}>
                        Energy Station <span style={{ fontSize: '0.6em', opacity: 0.7 }}>// 2026</span>
                    </h1>
                </div>

                {/* User Switcher */}
                <div style={{ display: 'flex', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '5px', borderRadius: '4px' }}>
                    {Object.values(USERS).map(u => (
                        <button
                            key={u.id}
                            onClick={() => setCurrentUser(u.id)}
                            style={{
                                background: currentUser === u.id ? '#4ECDC4' : 'transparent',
                                color: currentUser === u.id ? '#000' : '#8892b0',
                                border: 'none',
                                padding: '8px 16px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                transition: 'all 0.3s ease',
                                borderRadius: '2px'
                            }}
                        >
                            {u.name}
                        </button>
                    ))}
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '40px', maxWidth: '1200px', margin: '0 auto' }}>
                <KeywordManagerSection onOpenPlanet={setSelectedPlanet} />

                {/* Section 1: Input */}
                <section>
                    <CheckInPanel />
                </section>

                {/* Section 2: Chart */}
                <section style={{ background: 'rgba(10, 20, 30, 0.5)', padding: '20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <h2 style={{ marginTop: 0, marginBottom: '20px', borderLeft: '4px solid #FFD93D', paddingLeft: '10px' }}>GRAVITY TRAJECTORY</h2>
                    <div style={{ height: '400px' }}>
                        <GravityChart />
                    </div>
                </section>

                {/* Section 3: Calendar History */}
                <section>
                    <h2 style={{ marginTop: 0, marginBottom: '20px', borderLeft: '4px solid #FF4B4B', paddingLeft: '10px' }}>TEMPORAL RECORD</h2>
                    <EnergyCalendar />
                </section>

            </div>

            {selectedPlanet && (
                <PlanetDetailModal
                    planet={selectedPlanet}
                    onClose={() => setSelectedPlanet(null)}
                />
            )}
        </div>
    );
}

export default function EnergyStation({ goTo }) {
    return <EnergyStationContent goHome={() => goTo('home')} />;
}
