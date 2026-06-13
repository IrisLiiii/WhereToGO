import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { format, differenceInDays } from 'date-fns';

const EnergyContext = createContext();

export const USERS = {
    D: {
        id: 'Dd',
        name: '我',
        defaultKeywords: ['运动', '探索']
    },
    T: {
        id: 'Peachfuzzz',
        name: 'TA',
        defaultKeywords: []
    }
};

export const MAX_ACTIVE_KEYWORDS = 5;

const CURRENT_YEAR = new Date().getFullYear();
const KEYWORD_STATUS = {
    ACTIVE: 'active',
    ARCHIVED: 'archived'
};

const QUALITY_SCORES = {
    high: 3,
    medium: 2,
    low: 1,
    none: 0
};

const DECAY_RATE = 0.95;
const BASE_BOOST = 5;

export const PLANET_METADATA = {
    '求索': { en: 'Questing', desc: 'Maintain curiosity about the world and explore the unknown. Keep asking questions.' },
    '真实': { en: 'Authenticity', desc: 'Face the true self and the world. Be honest and transparent.' },
    '专注': { en: 'Focus', desc: 'Eliminate distractions and devote yourself wholeheartedly to the present moment.' },
    '减负': { en: 'Declutter', desc: 'Timely clean up physical and mental burdens. Travel light.' },
    '思考': { en: 'Thinking', desc: 'Think deeply and independently. Do not follow the crowd blindly.' },
    '在场': { en: 'Presence', desc: 'Be here, now. Fully engage with the current experience.' },
    '投入': { en: 'Commitment', desc: 'Once a choice is made, go all in. No hesitation.' }
};

const USER_LIST = Object.values(USERS);

function getUserConfigById(userId) {
    return USER_LIST.find((user) => user.id === userId) || USERS.D;
}

function sortKeywordRows(rows) {
    const statusOrder = {
        [KEYWORD_STATUS.ACTIVE]: 0,
        [KEYWORD_STATUS.ARCHIVED]: 1
    };

    return [...rows].sort((a, b) => {
        if (a.user_id !== b.user_id) return a.user_id.localeCompare(b.user_id);
        if ((b.year || 0) !== (a.year || 0)) return (b.year || 0) - (a.year || 0);
        if ((statusOrder[a.status] || 99) !== (statusOrder[b.status] || 99)) {
            return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
        }
        if (a.status === KEYWORD_STATUS.ARCHIVED && b.status === KEYWORD_STATUS.ARCHIVED) {
            return new Date(b.archived_at || 0).getTime() - new Date(a.archived_at || 0).getTime();
        }
        return (a.sort_order || 0) - (b.sort_order || 0);
    });
}

function buildDefaultKeywordRows() {
    return USER_LIST.flatMap((user) =>
        (user.defaultKeywords || [])
            .filter(Boolean)
            .map((keyword, index) => ({
                user_id: user.id,
                keyword,
                year: CURRENT_YEAR,
                status: KEYWORD_STATUS.ACTIVE,
                sort_order: index
            }))
    );
}

function getUniqueKeywords(rows, fallbackKeywords = []) {
    const merged = [...rows.map((row) => row.keyword), ...fallbackKeywords].filter(Boolean);
    return Array.from(new Set(merged));
}

export function EnergyProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(USERS.D.id);
    const [checkins, setCheckins] = useState([]);
    const [keywordTasks, setKeywordTasks] = useState([]);
    const [userKeywords, setUserKeywords] = useState(buildDefaultKeywordRows());
    const [loading, setLoading] = useState(true);

    const fetchCheckins = useCallback(async () => {
        const { data, error } = await supabase
            .from('checkins')
            .select('*')
            .order('date', { ascending: true });

        if (error) {
            console.error('Error fetching checkins:', error);
            return;
        }

        setCheckins(data || []);
    }, []);

    const fetchKeywordTasks = useCallback(async () => {
        const { data, error } = await supabase
            .from('keyword_tasks')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching keyword tasks:', error);
            return;
        }

        setKeywordTasks(data || []);
    }, []);

    const fetchUserKeywords = useCallback(async () => {
        const defaultRows = buildDefaultKeywordRows();

        const { data, error } = await supabase
            .from('user_keywords')
            .select('*')
            .order('user_id', { ascending: true })
            .order('year', { ascending: false })
            .order('status', { ascending: true })
            .order('sort_order', { ascending: true });

        if (error) {
            console.error('Error fetching user keywords:', error);
            setUserKeywords(sortKeywordRows(defaultRows));
            return;
        }

        if ((data || []).length === 0 && defaultRows.length > 0) {
            const { data: seededData, error: seedError } = await supabase
                .from('user_keywords')
                .insert(defaultRows)
                .select('*');

            if (seedError) {
                console.error('Error bootstrapping default keywords:', seedError);
                setUserKeywords(sortKeywordRows(defaultRows));
                return;
            }

            setUserKeywords(sortKeywordRows(seededData || defaultRows));
            return;
        }

        setUserKeywords(sortKeywordRows(data || []));
    }, []);

    useEffect(() => {
        let isMounted = true;

        const loadAll = async () => {
            setLoading(true);
            await Promise.all([fetchCheckins(), fetchKeywordTasks(), fetchUserKeywords()]);
            if (isMounted) {
                setLoading(false);
            }
        };

        loadAll();

        return () => {
            isMounted = false;
        };
    }, [fetchCheckins, fetchKeywordTasks, fetchUserKeywords]);

    const keywordRowsByUser = useMemo(() => {
        const grouped = {};
        USER_LIST.forEach((user) => {
            grouped[user.id] = sortKeywordRows(
                userKeywords.filter((row) => row.user_id === user.id)
            );
        });
        return grouped;
    }, [userKeywords]);

    const activeKeywordRecordsByUser = useMemo(() => {
        const grouped = {};
        USER_LIST.forEach((user) => {
            grouped[user.id] = (keywordRowsByUser[user.id] || []).filter(
                (row) => row.status === KEYWORD_STATUS.ACTIVE && row.year === CURRENT_YEAR
            );
        });
        return grouped;
    }, [keywordRowsByUser]);

    const archivedKeywordRecordsByUser = useMemo(() => {
        const grouped = {};
        USER_LIST.forEach((user) => {
            grouped[user.id] = (keywordRowsByUser[user.id] || []).filter(
                (row) => row.status === KEYWORD_STATUS.ARCHIVED
            );
        });
        return grouped;
    }, [keywordRowsByUser]);

    const allKeywordsByUser = useMemo(() => {
        const grouped = {};
        USER_LIST.forEach((user) => {
            grouped[user.id] = getUniqueKeywords(
                keywordRowsByUser[user.id] || [],
                user.defaultKeywords || []
            );
        });
        return grouped;
    }, [keywordRowsByUser]);

    const userInfo = useMemo(() => {
        const base = getUserConfigById(currentUser);
        const activeRecords = activeKeywordRecordsByUser[currentUser] || [];

        return {
            ...base,
            keywords: activeRecords.map((row) => row.keyword),
            keywordRecords: activeRecords
        };
    }, [currentUser, activeKeywordRecordsByUser]);

    const computeUserGravity = useCallback((targetUserId, targetKeywords, allCheckins) => {
        const userCheckins = allCheckins.filter((checkin) => checkin.user_id === targetUserId);
        const scoresByKeyword = {};
        const startDate = new Date(`${CURRENT_YEAR}-01-01`);
        const today = new Date();
        const totalDays = Math.max(differenceInDays(today, startDate), 0);

        targetKeywords.forEach((keyword) => {
            let currentScore = 0;
            const history = [];

            for (let i = 0; i <= totalDays; i++) {
                const currentDate = new Date(startDate);
                currentDate.setDate(startDate.getDate() + i);
                const dateStr = format(currentDate, 'yyyy-MM-dd');
                const checkin = userCheckins.find(
                    (item) => item.keyword === keyword && item.date === dateStr
                );

                if (checkin) {
                    const rawScore = QUALITY_SCORES[checkin.quality] || 0;
                    currentScore = Math.min(100, currentScore * DECAY_RATE + rawScore * BASE_BOOST);
                } else {
                    currentScore = currentScore * DECAY_RATE;
                }

                if (currentScore < 0.1) currentScore = 0;

                history.push({
                    date: dateStr,
                    score: parseFloat(currentScore.toFixed(1))
                });
            }

            scoresByKeyword[keyword] = history;
        });

        return scoresByKeyword;
    }, []);

    const gravityScores = useMemo(() => {
        const result = {};

        USER_LIST.forEach((user) => {
            result[user.id] = computeUserGravity(
                user.id,
                allKeywordsByUser[user.id] || [],
                checkins
            );
        });

        return result;
    }, [allKeywordsByUser, checkins, computeUserGravity]);

    const getKeywordHistory = useCallback((userId, keyword) => {
        return gravityScores[userId]?.[keyword] || [];
    }, [gravityScores]);

    const getKeywordCheckins = useCallback((userId, keyword) => {
        return checkins
            .filter((checkin) => checkin.user_id === userId && checkin.keyword === keyword)
            .sort((a, b) => b.date.localeCompare(a.date));
    }, [checkins]);

    const getKeywordTasks = useCallback((userId, keyword) => {
        return keywordTasks
            .filter((task) => task.user_id === userId && task.keyword === keyword)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [keywordTasks]);

    const addCheckin = useCallback(async (dateStr, keyword, quality) => {
        const newCheckin = {
            user_id: currentUser,
            date: dateStr,
            keyword,
            quality
        };

        const { error } = await supabase
            .from('checkins')
            .upsert(newCheckin, { onConflict: 'user_id, date, keyword' });

        if (error) {
            console.error('Error saving checkin:', error);
            return { ok: false, message: error.message };
        }

        await fetchCheckins();
        return { ok: true };
    }, [currentUser, fetchCheckins]);

    const createKeyword = useCallback(async (keyword, targetUserId = currentUser) => {
        const trimmedKeyword = keyword.trim();
        const activeRecords = activeKeywordRecordsByUser[targetUserId] || [];
        const existingRecords = keywordRowsByUser[targetUserId] || [];

        if (!trimmedKeyword) {
            return { ok: false, message: '关键词不能为空。' };
        }

        if (activeRecords.length >= MAX_ACTIVE_KEYWORDS) {
            return { ok: false, message: `每个人最多只能保留 ${MAX_ACTIVE_KEYWORDS} 个年度关键词。` };
        }

        if (existingRecords.some((row) => row.keyword === trimmedKeyword)) {
            return { ok: false, message: '这个关键词名称已经使用过了，换一个新的吧。' };
        }

        const payload = {
            user_id: targetUserId,
            keyword: trimmedKeyword,
            year: CURRENT_YEAR,
            status: KEYWORD_STATUS.ACTIVE,
            sort_order: activeRecords.length
        };

        const { data, error } = await supabase
            .from('user_keywords')
            .insert(payload)
            .select('*')
            .single();

        if (error) {
            console.error('Error creating keyword:', error);
            return { ok: false, message: error.message };
        }

        setUserKeywords((prev) => sortKeywordRows([...prev, data]));
        return { ok: true };
    }, [activeKeywordRecordsByUser, currentUser, keywordRowsByUser]);

    const renameKeyword = useCallback(async (keywordId, nextKeyword) => {
        const targetRow = userKeywords.find((row) => row.id === keywordId);
        const trimmedKeyword = nextKeyword.trim();

        if (!targetRow) {
            return { ok: false, message: '没有找到要修改的关键词。' };
        }

        if (!trimmedKeyword) {
            return { ok: false, message: '关键词不能为空。' };
        }

        if (trimmedKeyword === targetRow.keyword) {
            return { ok: true };
        }

        const existingRecords = keywordRowsByUser[targetRow.user_id] || [];
        const hasDuplicate = existingRecords.some(
            (row) => row.id !== keywordId && row.keyword === trimmedKeyword
        );

        if (hasDuplicate) {
            return { ok: false, message: '这个关键词名称已经使用过了，换一个新的吧。' };
        }

        const { error: keywordError } = await supabase
            .from('user_keywords')
            .update({ keyword: trimmedKeyword })
            .eq('id', keywordId);

        if (keywordError) {
            console.error('Error renaming keyword row:', keywordError);
            return { ok: false, message: keywordError.message };
        }

        const [{ error: checkinError }, { error: taskError }] = await Promise.all([
            supabase
                .from('checkins')
                .update({ keyword: trimmedKeyword })
                .eq('user_id', targetRow.user_id)
                .eq('keyword', targetRow.keyword),
            supabase
                .from('keyword_tasks')
                .update({ keyword: trimmedKeyword })
                .eq('user_id', targetRow.user_id)
                .eq('keyword', targetRow.keyword)
        ]);

        if (checkinError || taskError) {
            console.error('Error syncing renamed keyword:', checkinError || taskError);
            return { ok: false, message: (checkinError || taskError)?.message || '关键词重命名失败。' };
        }

        setUserKeywords((prev) =>
            sortKeywordRows(prev.map((row) => (
                row.id === keywordId ? { ...row, keyword: trimmedKeyword } : row
            )))
        );
        setCheckins((prev) => prev.map((checkin) => (
            checkin.user_id === targetRow.user_id && checkin.keyword === targetRow.keyword
                ? { ...checkin, keyword: trimmedKeyword }
                : checkin
        )));
        setKeywordTasks((prev) => prev.map((task) => (
            task.user_id === targetRow.user_id && task.keyword === targetRow.keyword
                ? { ...task, keyword: trimmedKeyword }
                : task
        )));

        return { ok: true };
    }, [keywordRowsByUser, userKeywords]);

    const archiveKeyword = useCallback(async (keywordId) => {
        const targetRow = userKeywords.find((row) => row.id === keywordId);
        if (!targetRow) {
            return { ok: false, message: '没有找到要存档的关键词。' };
        }

        const archivedAt = new Date().toISOString();
        const { error } = await supabase
            .from('user_keywords')
            .update({
                status: KEYWORD_STATUS.ARCHIVED,
                archived_at: archivedAt
            })
            .eq('id', keywordId);

        if (error) {
            console.error('Error archiving keyword:', error);
            return { ok: false, message: error.message };
        }

        setUserKeywords((prev) =>
            sortKeywordRows(prev.map((row) => (
                row.id === keywordId
                    ? { ...row, status: KEYWORD_STATUS.ARCHIVED, archived_at: archivedAt }
                    : row
            )))
        );

        return { ok: true };
    }, [userKeywords]);

    const deleteKeywordPermanently = useCallback(async (keywordId) => {
        const targetRow = userKeywords.find((row) => row.id === keywordId);
        if (!targetRow) {
            return { ok: false, message: '没有找到要删除的关键词。' };
        }

        const [{ error: checkinError }, { error: taskError }, { error: rowError }] = await Promise.all([
            supabase
                .from('checkins')
                .delete()
                .eq('user_id', targetRow.user_id)
                .eq('keyword', targetRow.keyword),
            supabase
                .from('keyword_tasks')
                .delete()
                .eq('user_id', targetRow.user_id)
                .eq('keyword', targetRow.keyword),
            supabase
                .from('user_keywords')
                .delete()
                .eq('id', keywordId)
        ]);

        if (checkinError || taskError || rowError) {
            console.error('Error deleting keyword:', checkinError || taskError || rowError);
            return { ok: false, message: (checkinError || taskError || rowError)?.message || '关键词删除失败。' };
        }

        setUserKeywords((prev) => sortKeywordRows(prev.filter((row) => row.id !== keywordId)));
        setCheckins((prev) => prev.filter((checkin) => !(
            checkin.user_id === targetRow.user_id && checkin.keyword === targetRow.keyword
        )));
        setKeywordTasks((prev) => prev.filter((task) => !(
            task.user_id === targetRow.user_id && task.keyword === targetRow.keyword
        )));

        return { ok: true };
    }, [userKeywords]);

    const addKeywordTask = useCallback(async (keyword, content, targetUserId = currentUser) => {
        const trimmedContent = content.trim();
        if (!trimmedContent) {
            return { ok: false, message: '子任务不能为空。' };
        }

        const newTask = {
            user_id: targetUserId,
            keyword,
            content: trimmedContent,
            is_completed: false,
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('keyword_tasks')
            .insert(newTask)
            .select('*')
            .single();

        if (error) {
            console.error('Error saving keyword task:', error);
            return { ok: false, message: error.message };
        }

        setKeywordTasks((prev) => [...prev, data]);
        return { ok: true };
    }, [currentUser]);

    const toggleKeywordTask = useCallback(async (taskId, currentStatus) => {
        setKeywordTasks((prev) => prev.map((task) => (
            task.id === taskId ? { ...task, is_completed: !currentStatus } : task
        )));

        const { error } = await supabase
            .from('keyword_tasks')
            .update({ is_completed: !currentStatus })
            .eq('id', taskId);

        if (error) {
            console.error('Error toggling keyword task:', error);
            fetchKeywordTasks();
        }
    }, [fetchKeywordTasks]);

    const deleteKeywordTask = useCallback(async (taskId) => {
        setKeywordTasks((prev) => prev.filter((task) => task.id !== taskId));
        const { error } = await supabase
            .from('keyword_tasks')
            .delete()
            .eq('id', taskId);

        if (error) {
            console.error('Error deleting keyword task:', error);
            fetchKeywordTasks();
        }
    }, [fetchKeywordTasks]);

    const starshipState = useMemo(() => {
        const MAX_DAILY_PER_KEYWORD = 350;
        const DAYS_IN_YEAR = 365;
        const TARGET_RATIO = 0.75;
        const SINGLE_KEYWORD_TARGET = MAX_DAILY_PER_KEYWORD * DAYS_IN_YEAR * TARGET_RATIO;
        const activeKeywordPairs = USER_LIST.flatMap((user) =>
            (activeKeywordRecordsByUser[user.id] || []).map((row) => ({
                userId: user.id,
                userName: user.name,
                keyword: row.keyword
            }))
        );

        if (activeKeywordPairs.length === 0) {
            return {
                totalPoints: 0,
                target: SINGLE_KEYWORD_TARGET,
                progress: 0,
                keywordStats: {},
                keywordStatsList: [],
                status: 'IDLE'
            };
        }

        const gravityMap = USER_LIST.reduce((acc, user) => {
            acc[user.id] = gravityScores[user.id] || {};
            return acc;
        }, {});

        const maxGains = {
            high: 350,
            medium: 200,
            low: 100,
            none: 0
        };

        const keywordPointsMap = activeKeywordPairs.reduce((acc, pair) => {
            acc[`${pair.userId}::${pair.keyword}`] = {
                ...pair,
                points: 0,
                progress: 0
            };
            return acc;
        }, {});

        let totalPoints = 0;

        checkins.forEach((checkin) => {
            const maxGain = maxGains[checkin.quality] || 0;
            if (maxGain === 0) return;

            const key = `${checkin.user_id}::${checkin.keyword}`;
            if (!keywordPointsMap[key]) return;

            const history = gravityMap[checkin.user_id]?.[checkin.keyword] || [];
            const dayRecord = history.find((record) => record.date === checkin.date);
            const dayGravity = dayRecord?.score || 0;
            const actualPoints = maxGain * 0.5 + (maxGain * 0.5) * (dayGravity / 100);

            totalPoints += actualPoints;
            keywordPointsMap[key].points += actualPoints;
        });

        const target = SINGLE_KEYWORD_TARGET * activeKeywordPairs.length;
        const keywordStatsList = Object.values(keywordPointsMap).map((item) => ({
            ...item,
            progress: Math.min(100, (item.points / SINGLE_KEYWORD_TARGET) * 100)
        }));
        const keywordStats = keywordStatsList.reduce((acc, item) => {
            acc[`${item.userId}::${item.keyword}`] = item.progress;
            return acc;
        }, {});

        return {
            totalPoints,
            target,
            progress: Math.min(100, Math.max(0, (totalPoints / target) * 100)),
            keywordStats,
            keywordStatsList,
            status: 'ACTIVE'
        };
    }, [activeKeywordRecordsByUser, checkins, gravityScores]);

    return (
        <EnergyContext.Provider value={{
            currentUser,
            setCurrentUser,
            currentYear: CURRENT_YEAR,
            maxActiveKeywords: MAX_ACTIVE_KEYWORDS,
            userInfo,
            users: USERS,
            checkins,
            keywordTasks,
            userKeywords,
            keywordRowsByUser,
            activeKeywordRecordsByUser,
            archivedKeywordRecordsByUser,
            addCheckin,
            gravityScores,
            getKeywordHistory,
            getKeywordCheckins,
            getKeywordTasks,
            loading,
            starshipState,
            createKeyword,
            renameKeyword,
            archiveKeyword,
            deleteKeywordPermanently,
            addKeywordTask,
            toggleKeywordTask,
            deleteKeywordTask,
            PLANET_METADATA
        }}>
            {children}
        </EnergyContext.Provider>
    );
}

export function useEnergy() {
    return useContext(EnergyContext);
}
