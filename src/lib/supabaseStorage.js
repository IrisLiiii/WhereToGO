import { supabase } from './supabaseClient';

/**
 * 上传图片到 Supabase Storage
 * 
 * @param {File|Blob} file - 要上传的文件
 * @param {string} bucket - Bucket 名称 (如 'firsts-images')
 * @param {object} options
 * @returns {Promise<{publicUrl: string | null, path: string}>}
 */
export async function uploadToSupabase(file, bucket = 'firsts-images', options = {}) {
    const {
        folder = '',
        upsert = false,
        returnPublicUrl = true
    } = options;
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${file.name?.split('.').pop() || 'jpg'}`;
    const filePath = folder ? `${folder}/${fileName}` : fileName;

    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert
        });

    if (error) {
        throw error;
    }

    let publicUrl = null;
    if (returnPublicUrl) {
        const { data: publicData } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);
        publicUrl = publicData?.publicUrl || null;
    }

    return { publicUrl, path: filePath };
}

/**
 * 获取图片的公开 URL
 */
export function getSupabasePublicUrl(path, bucket = 'firsts-images') {
    const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);
    return publicUrl;
}

/**
 * 为私有 bucket 生成单个签名 URL
 */
export async function createSignedUrl(path, bucket = 'cities-images', expiresIn = 3600) {
    if (!path) return null;
    const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

    if (error) {
        throw error;
    }

    return data?.signedUrl || null;
}

/**
 * 为私有 bucket 批量生成签名 URL
 */
export async function createSignedUrls(paths, bucket = 'cities-images', expiresIn = 3600) {
    const validPaths = (paths || []).filter(Boolean);
    if (validPaths.length === 0) return [];

    const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrls(validPaths, expiresIn);

    if (error) {
        throw error;
    }

    return (data || []).map(item => item?.signedUrl || null);
}

/**
 * 删除 Storage 文件
 */
export async function deleteFromSupabase(paths, bucket = 'cities-images') {
    const targetPaths = Array.isArray(paths) ? paths.filter(Boolean) : [paths].filter(Boolean);
    if (targetPaths.length === 0) return;

    const { error } = await supabase.storage
        .from(bucket)
        .remove(targetPaths);

    if (error) {
        throw error;
    }
}
