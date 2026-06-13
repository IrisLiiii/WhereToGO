import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEnergy } from '../../context/EnergyContext';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfMonth, startOfYear, isAfter } from 'date-fns';

function buildFallbackMeta(keyword) {
    return {
        en: keyword,
        desc: '这是你们自己定义的年度关键词，它会和打卡、任务、档案一起沉淀成一颗属于你们的星球。'
    };
}

export default function PlanetDetailModal({ planet, onClose }) {
    const {
        PLANET_METADATA,
        addKeywordTask,
        toggleKeywordTask,
        deleteKeywordTask,
        getKeywordHistory,
        getKeywordCheckins,
        getKeywordTasks
    } = useEnergy();
    const [newTaskInput, setNewTaskInput] = useState('');

    if (!planet) return null;

    const { keyword, userId, userName, status = 'active' } = planet;
    const meta = PLANET_METADATA[keyword] || buildFallbackMeta(keyword);
    const chartData = useMemo(() => getKeywordHistory(userId, keyword), [getKeywordHistory, keyword, userId]);
    const checkinRecords = useMemo(() => getKeywordCheckins(userId, keyword), [getKeywordCheckins, keyword, userId]);
    const tasks = useMemo(() => getKeywordTasks(userId, keyword), [getKeywordTasks, keyword, userId]);
    const readOnly = status === 'archived';

    const stats = useMemo(() => {
        const today = new Date();
        const calcPeriod = (startDate) => {
            return checkinRecords.filter((checkin) => isAfter(new Date(checkin.date), startDate)).length;
        };

        return {
            week: calcPeriod(subDays(today, 7)),
            month: calcPeriod(startOfMonth(today)),
            year: calcPeriod(startOfYear(today))
        };
    }, [checkinRecords]);

    const handleAddTask = async (e) => {
        if (e.key === 'Enter' && newTaskInput.trim()) {
            const result = await addKeywordTask(keyword, newTaskInput.trim(), userId);
            if (result.ok) {
                setNewTaskInput('');
            }
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.82)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 2000,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '20px'
                }}
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.94, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.94, y: 20 }}
                    style={{
                        width: 'min(760px, 96vw)',
                        maxHeight: '90vh',
                        background: '#0a0f18',
                        border: '1px solid #4ECDC4',
                        borderRadius: '18px',
                        padding: '24px',
                        overflowY: 'auto',
                        color: '#E0E6ED',
                        fontFamily: '"Rajdhani", sans-serif',
                        boxShadow: '0 0 50px rgba(78, 205, 196, 0.2)'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '24px', marginBottom: '20px' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                <h2 style={{ margin: 0, fontSize: '32px', color: '#4ECDC4' }}>{keyword}</h2>
                                <span style={{
                                    padding: '4px 10px',
                                    borderRadius: '999px',
                                    fontSize: '12px',
                                    letterSpacing: '1px',
                                    color: readOnly ? '#ffd166' : '#4ECDC4',
                                    border: `1px solid ${readOnly ? '#ffd166' : '#4ECDC4'}`
                                }}>
                                    {readOnly ? 'ARCHIVED' : 'ACTIVE'}
                                </span>
                            </div>
                            <div style={{ fontSize: '15px', color: '#a0aec0', marginBottom: '6px' }}>{userName} 的关键词星球</div>
                            <span style={{ fontSize: '16px', color: '#8892b0', textTransform: 'uppercase', letterSpacing: '2px' }}>{meta.en}</span>
                        </div>
                        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#888', fontSize: '24px', cursor: 'pointer' }}>×</button>
                    </div>

                    <div style={{
                        marginBottom: '30px',
                        padding: '16px',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '12px',
                        borderLeft: '4px solid #4ECDC4',
                        fontSize: '16px',
                        lineHeight: '1.7'
                    }}>
                        {meta.desc}
                    </div>

                    <div style={{ marginBottom: '30px' }}>
                        <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', marginBottom: '15px' }}>引力轨迹</h3>
                        <div style={{ display: 'flex', gap: '20px', marginBottom: '15px', fontSize: '14px', color: '#8892b0', flexWrap: 'wrap' }}>
                            <span>本周记录: <b style={{ color: '#fff' }}>{stats.week}</b></span>
                            <span>本月记录: <b style={{ color: '#fff' }}>{stats.month}</b></span>
                            <span>年度累计: <b style={{ color: '#fff' }}>{stats.year}</b></span>
                        </div>
                        <div style={{ height: '220px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <XAxis dataKey="date" hide />
                                    <YAxis domain={[0, 100]} hide />
                                    <Tooltip
                                        contentStyle={{ background: '#050b14', border: '1px solid #4ECDC4', color: '#fff' }}
                                        itemStyle={{ color: '#4ECDC4' }}
                                        labelFormatter={(value) => value}
                                    />
                                    <Line type="monotone" dataKey="score" stroke="#4ECDC4" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '26px' }}>
                        <div>
                            <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', marginBottom: '15px' }}>
                                {readOnly ? '旧子任务' : '子任务'}
                            </h3>

                            {!readOnly && (
                                <input
                                    type="text"
                                    placeholder="添加新的关键词任务，回车保存..."
                                    value={newTaskInput}
                                    onChange={(e) => setNewTaskInput(e.target.value)}
                                    onKeyDown={handleAddTask}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        background: 'rgba(0,0,0,0.3)',
                                        border: '1px solid #333',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        marginBottom: '15px',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {tasks.length === 0 && <div style={{ color: '#666', fontStyle: 'italic' }}>暂无子任务</div>}
                                {tasks.map((task) => (
                                    <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                        {!readOnly && (
                                            <input
                                                type="checkbox"
                                                checked={task.is_completed}
                                                onChange={() => toggleKeywordTask(task.id, task.is_completed)}
                                                style={{ cursor: 'pointer', accentColor: '#4ECDC4' }}
                                            />
                                        )}
                                        <span style={{
                                            flex: 1,
                                            textDecoration: task.is_completed ? 'line-through' : 'none',
                                            color: task.is_completed ? '#666' : '#fff',
                                            opacity: task.is_completed ? 0.6 : 1
                                        }}>
                                            {task.content}
                                        </span>
                                        {!readOnly && (
                                            <button
                                                onClick={() => deleteKeywordTask(task.id)}
                                                style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer' }}
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', marginBottom: '15px' }}>
                                {readOnly ? '旧打卡记录' : '最近打卡'}
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {checkinRecords.length === 0 && (
                                    <div style={{ color: '#666', fontStyle: 'italic' }}>还没有打卡记录</div>
                                )}
                                {checkinRecords.slice(0, 12).map((record) => (
                                    <div key={`${record.date}-${record.keyword}`} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '10px 12px',
                                        background: 'rgba(255,255,255,0.03)',
                                        borderRadius: '8px'
                                    }}>
                                        <span style={{ color: '#fff' }}>{format(new Date(record.date), 'yyyy.MM.dd')}</span>
                                        <span style={{ color: '#4ECDC4', textTransform: 'uppercase' }}>{record.quality}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
