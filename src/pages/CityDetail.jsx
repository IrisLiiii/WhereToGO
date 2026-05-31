import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import imageCompression from 'browser-image-compression';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { createSignedUrl, uploadToSupabase } from '../lib/supabaseStorage';

export default function CityDetail({ cityName, goBack }) {
  const [scrollY, setScrollY] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentCity, setCurrentCity] = useState({ mainImage: '', description: '', gallery: [], id: null });
  const [comments, setComments] = useState([]);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const { user, profile } = useAuth();

  const resolveImageUrl = async (path, bucket, fallbackUrl = '') => {
    if (path) {
      try {
        const signedUrl = await createSignedUrl(path, bucket || 'cities-images');
        if (signedUrl) return signedUrl;
      } catch (error) {
        console.error('Failed to resolve signed image URL:', error);
      }
    }
    return fallbackUrl || '';
  };

  // 从 Supabase 加载城市数据
  useEffect(() => {
    const loadCityData = async () => {
      console.log(`[CityDetail] Loading data for city: "${cityName}"`);
      setLoading(true);
      try {
        console.log(`[CityDetail] Fetching city metadata for name: "${cityName.trim()}"`);
        const { data: cityData, error: cityError } = await supabase
          .from('cities')
          .select('*')
          .eq('name', cityName.trim())
          .single();

        if (cityError || !cityData) {
          console.error(`[CityDetail] Failed to load city "${cityName}":`, cityError);
          setLoading(false);
          return;
        }

        console.log(`[CityDetail] City found:`, cityData);

        const { data: imagesData, error: imagesError } = await supabase
          .from('city_images')
          .select('id, url, storage_path, storage_bucket, sort_order, caption')
          .eq('city_id', cityData.id)
          .order('sort_order', { ascending: true });

        if (imagesError) {
          console.error(`[CityDetail] Failed to load images for city ID ${cityData.id}:`, imagesError);
        } else {
          console.log(`[CityDetail] Successfully fetched ${imagesData?.length || 0} images for city ID ${cityData.id}:`, imagesData);
        }

        const signedGallery = await Promise.all((imagesData || []).map(async (img) => ({
          ...img,
          signedUrl: await resolveImageUrl(img.storage_path, img.storage_bucket, img.url)
        })));

        const mainImage = await resolveImageUrl(
          cityData.main_image_path,
          cityData.main_image_bucket,
          cityData.main_image
        );

        const { data: commentsData, error: commentsError } = await supabase
          .from('city_comments')
          .select('id, author_name, content, created_at')
          .eq('city_id', cityData.id)
          .order('created_at', { ascending: false });

        if (commentsError) {
          console.error(`[CityDetail] Failed to load comments for city ID ${cityData.id}:`, commentsError);
        }

        setCurrentCity({
          id: cityData.id,
          mainImage,
          description: cityData.description || '',
          impression: cityData.impression || '',
          departure: cityData.departure || '',
          lng: cityData.lng,
          lat: cityData.lat,
          gallery: signedGallery.map(img => img.signedUrl || img.url).filter(Boolean),
          galleryRecords: signedGallery,
        });
        setComments(commentsData || []);
      } catch (e) {
        console.error(`[CityDetail] Unexpected error loading city "${cityName}":`, e);
      }
      setLoading(false);
    };

    if (cityName) {
      loadCityData();
    }
  }, [cityName]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrollY(currentScrollY);
      setIsDarkMode(currentScrollY < window.innerHeight);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  const handleImageError = (e) => {
    e.target.style.display = 'none';
  };

  const getViewerImages = () => {
    const mergedImages = [];
    if (currentCity.mainImage) {
      mergedImages.push(currentCity.mainImage);
    }
    (currentCity.gallery || []).forEach((image) => {
      if (image && !mergedImages.includes(image)) {
        mergedImages.push(image);
      }
    });
    return mergedImages;
  };

  const formatCommentTime = (value) => {
    if (!value) return '';
    try {
      return new Date(value).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return value;
    }
  };

  const refreshCityDetail = async () => {
    if (!cityName) return;
    setLoading(true);
    try {
      const { data: cityData } = await supabase
        .from('cities')
        .select('*')
        .eq('name', cityName.trim())
        .single();

      if (!cityData) return;

      const { data: imagesData } = await supabase
        .from('city_images')
        .select('id, url, storage_path, storage_bucket, sort_order, caption')
        .eq('city_id', cityData.id)
        .order('sort_order', { ascending: true });

      const signedGallery = await Promise.all((imagesData || []).map(async (img) => ({
        ...img,
        signedUrl: await resolveImageUrl(img.storage_path, img.storage_bucket, img.url)
      })));

      const mainImage = await resolveImageUrl(
        cityData.main_image_path,
        cityData.main_image_bucket,
        cityData.main_image
      );

      const { data: commentsData } = await supabase
        .from('city_comments')
        .select('id, author_name, content, created_at')
        .eq('city_id', cityData.id)
        .order('created_at', { ascending: false });

      setCurrentCity({
        id: cityData.id,
        mainImage,
        description: cityData.description || '',
        impression: cityData.impression || '',
        departure: cityData.departure || '',
        lng: cityData.lng,
        lat: cityData.lat,
        gallery: signedGallery.map(img => img.signedUrl || img.url).filter(Boolean),
        galleryRecords: signedGallery,
      });
      setComments(commentsData || []);
    } finally {
      setLoading(false);
    }
  };

  const handleCommentSubmit = async () => {
    if (!currentCity.id || !commentDraft.trim() || commentSubmitting) return;
    setCommentSubmitting(true);
    setActionMessage('');
    try {
      const authorName = profile?.display_name || user?.email?.split('@')[0] || '成员';
      const { error } = await supabase
        .from('city_comments')
        .insert({
          city_id: currentCity.id,
          author_name: authorName,
          content: commentDraft.trim()
        });
      if (error) throw error;
      setCommentDraft('');
      setActionMessage('留言已保存');
      await refreshCityDetail();
    } catch (error) {
      console.error('Failed to submit comment:', error);
      setActionMessage(`留言保存失败：${error.message}`);
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handlePhotoUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!currentCity.id || files.length === 0 || photoUploading) return;

    setPhotoUploading(true);
    setActionMessage('');
    try {
      const startSortOrder = currentCity.galleryRecords?.length || 0;
      const imageRecords = [];

      for (let i = 0; i < files.length; i++) {
        const compressed = await imageCompression(files[i], { maxSizeMB: 1, maxWidthOrHeight: 1920 });
        const { path } = await uploadToSupabase(compressed, 'cities-images', {
          folder: `cities/${currentCity.id}`,
          returnPublicUrl: false
        });
        imageRecords.push({
          city_id: currentCity.id,
          url: null,
          storage_path: path,
          storage_bucket: 'cities-images',
          sort_order: startSortOrder + i
        });
      }

      const { error: insertError } = await supabase
        .from('city_images')
        .insert(imageRecords);

      if (insertError) throw insertError;

      if (!currentCity.mainImage && imageRecords[0]?.storage_path) {
        await supabase
          .from('cities')
          .update({
            main_image: null,
            main_image_path: imageRecords[0].storage_path,
            main_image_bucket: 'cities-images'
          })
          .eq('id', currentCity.id);
      }

      setActionMessage(`已上传 ${files.length} 张照片`);
      await refreshCityDetail();
    } catch (error) {
      console.error('Failed to upload city photos:', error);
      setActionMessage(`照片上传失败：${error.message}`);
    } finally {
      setPhotoUploading(false);
    }
  };

  const openImageViewer = (image, index) => {
    if (!image) return;
    setSelectedImage(image);
    setCurrentImageIndex(index);
    document.body.style.overflow = 'hidden';
  };

  const closeImageViewer = () => {
    setSelectedImage(null);
    document.body.style.overflow = 'auto';
  };

  const showPreviousImage = () => {
    const allImages = getViewerImages();
    if (allImages.length === 0) return;
    const newIndex = currentImageIndex > 0 ? currentImageIndex - 1 : allImages.length - 1;
    setCurrentImageIndex(newIndex);
    setSelectedImage(allImages[newIndex]);
  };

  const showNextImage = () => {
    const allImages = getViewerImages();
    if (allImages.length === 0) return;
    const newIndex = currentImageIndex < allImages.length - 1 ? currentImageIndex + 1 : 0;
    setCurrentImageIndex(newIndex);
    setSelectedImage(allImages[newIndex]);
  };

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!selectedImage) return;

      if (e.key === 'Escape') {
        closeImageViewer();
      } else if (e.key === 'ArrowLeft') {
        showPreviousImage();
      } else if (e.key === 'ArrowRight') {
        showNextImage();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [selectedImage, currentImageIndex]);

  if (loading) {
    return (
      <div style={{ width: '100%', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0a0f1a 0%, #0d1525 40%, #111d35 100%)', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '16px' }}>加载中...</div>
          <div style={{ fontSize: '1rem', opacity: 0.6 }}>{cityName}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="city-detail">
      <button
        className={`back-button ${isDarkMode ? 'dark' : 'light'}`}
        onClick={goBack}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        返回
      </button>

      {/* 全屏主页面 */}
      <div className="hero-section">
        <div
          className="hero-background"
          style={{
            backgroundImage: `url("${currentCity.mainImage}")`,
            transform: `translateY(${scrollY * 0.5}px)`,
          }}
          onClick={() => openImageViewer(currentCity.mainImage, 0)}
        />
        <div className="hero-overlay" />

        <motion.div
          className="hero-content"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          style={{ width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        >
          <h1 className="city-name">{cityName}</h1>
          <div className="location-meta" style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
            {currentCity.description && (
              <div className="meta-item" style={{ fontSize: '1.4rem', opacity: 0.9, fontWeight: 300, letterSpacing: '1px' }}>
                {currentCity.description}
              </div>
            )}
          </div>
        </motion.div>

        <div className="scroll-indicator">
          <span>向下滑动查看更多</span>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 13l5 5 5-5M7 6l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* 图片流区域 */}
      <div className="gallery-section">
        <div className="gallery-container">
          <h2 className="gallery-title">精彩瞬间</h2>
          {(currentCity.description || currentCity.departure || currentCity.lng || currentCity.lat) && (
            <div className="city-overview-card">
              {currentCity.description && (
                <div className="overview-row">
                  <span className="overview-label">时间</span>
                  <span className="overview-value">{currentCity.description}</span>
                </div>
              )}
              {currentCity.departure && (
                <div className="overview-row">
                  <span className="overview-label">出发地</span>
                  <span className="overview-value">{currentCity.departure}</span>
                </div>
              )}
              {currentCity.lng && currentCity.lat && (
                <div className="overview-row">
                  <span className="overview-label">坐标</span>
                  <span className="overview-value">{currentCity.lng}, {currentCity.lat}</span>
                </div>
              )}
            </div>
          )}
          <div className="gallery-grid">
            {currentCity.gallery.length > 0 ? (
              currentCity.gallery.map((image, index) => {
                const viewerIndex = getViewerImages().indexOf(image);
                return (
                  <motion.div
                    key={index}
                    className="gallery-item"
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    onClick={() => openImageViewer(image, viewerIndex >= 0 ? viewerIndex : index)}
                  >
                    <img
                      src={image}
                      alt={`${cityName} 精彩记录 ${index + 1}`}
                      onError={handleImageError}
                    />
                  </motion.div>
                );
              })
            ) : (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '100px 0', color: '#999', fontSize: '1.1rem', letterSpacing: '1px' }}>
                照片都被藏起来了哦，自己去上传试试吧～
              </div>
            )}
          </div>

          <div className="memory-tools-grid">
            <div className="memory-card">
              <div className="memory-card-header">
                <h3>继续补照片</h3>
                <span>{currentCity.galleryRecords?.length || 0} 张</span>
              </div>
              <p className="memory-card-desc">可以直接从网页往这个城市继续补传照片，上传后会保存进 `cities-images` bucket。</p>
              <label className={`upload-inline-button ${photoUploading ? 'disabled' : ''}`}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  disabled={photoUploading}
                />
                {photoUploading ? '正在上传...' : '上传新照片'}
              </label>
            </div>

            <div className="memory-card">
              <div className="memory-card-header">
                <h3>回忆留言</h3>
                <span>{comments.length} 条</span>
              </div>
              <p className="memory-card-desc">先把留言显示在城市详情页，之后如果你想单独做时间线或对话样式，再继续细化。</p>
              <textarea
                className="comment-textarea"
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                placeholder="写下这座城市的一句回忆..."
                maxLength={500}
              />
              <div className="comment-action-row">
                <span className="comment-author">
                  署名：{profile?.display_name || user?.email?.split('@')[0] || '成员'}
                </span>
                <button
                  className="comment-submit-button"
                  onClick={handleCommentSubmit}
                  disabled={!commentDraft.trim() || commentSubmitting}
                >
                  {commentSubmitting ? '保存中...' : '保存留言'}
                </button>
              </div>
            </div>
          </div>

          {actionMessage && (
            <div className={`action-message ${actionMessage.includes('失败') ? 'error' : 'success'}`}>
              {actionMessage}
            </div>
          )}

          <div className="comments-section">
            <h2 className="comments-title">这座城市的留言</h2>
            {comments.length === 0 ? (
              <div className="comments-empty">还没有留言，写下第一条回忆吧。</div>
            ) : (
              <div className="comments-list">
                {comments.map((comment) => (
                  <motion.div
                    key={comment.id}
                    className="comment-card"
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    viewport={{ once: true }}
                  >
                    <div className="comment-meta">
                      <span className="comment-name">{comment.author_name}</span>
                      <span className="comment-time">{formatCommentTime(comment.created_at)}</span>
                    </div>
                    <div className="comment-content">{comment.content}</div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 图片查看器模态框 */}
      {selectedImage && (
        <div className="image-viewer-overlay" onClick={closeImageViewer}>
          <div className="image-viewer-container" onClick={(e) => e.stopPropagation()}>
            <button className="image-viewer-close" onClick={closeImageViewer}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <button className="image-viewer-nav prev" onClick={showPreviousImage}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <button className="image-viewer-nav next" onClick={showNextImage}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <img
              src={selectedImage}
              alt="放大查看"
              className="image-viewer-img"
              onError={handleImageError}
            />

            <div className="image-viewer-counter">
              {currentImageIndex + 1} / {getViewerImages().length}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .city-detail {
          width: 100%;
          height: 100%;
          overflow-y: auto;
        }

        .hero-section {
          position: relative;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .hero-background {
          position: absolute;
          top: -20%;
          left: -20%;
          width: 140%;
          height: 140%;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          background-image: linear-gradient(45deg, #1e3c72, #2a5298);
          cursor: pointer;
        }

        .hero-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
        }

        .back-button {
          position: fixed;
          top: 30px;
          left: 30px;
          padding: 12px 24px;
          border-radius: 30px;
          border: none;
          font-size: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          z-index: 100;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .back-button.dark {
          background: rgba(0, 0, 0, 0.7);
          color: white;
          backdrop-filter: blur(10px);
        }

        .back-button.dark:hover {
          background: rgba(0, 0, 0, 0.9);
          transform: translateY(-2px);
        }

        .back-button.light {
          background: rgba(255, 255, 255, 0.9);
          color: black;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(0, 0, 0, 0.1);
        }

        .back-button.light:hover {
          background: rgba(255, 255, 255, 1);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
        }

        .hero-content {
          position: relative;
          z-index: 5;
          text-align: center;
          color: white;
          max-width: 80%;
        }

        .city-name {
          font-size: clamp(3rem, 10vw, 6rem);
          font-weight: 800;
          margin: 0 0 20px 0;
          letter-spacing: -2px;
          text-shadow: 0 2px 20px rgba(0,0,0,0.5);
        }

        .meta-item {
          display: flex;
          align-items: center;
        }

        .scroll-indicator {
          position: absolute;
          bottom: 40px;
          left: 50%;
          transform: translateX(-50%);
          color: white;
          text-align: center;
          z-index: 10;
          animation: bounce 2s infinite;
        }

        .scroll-indicator span {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
          opacity: 0.8;
        }

        .gallery-section {
          background: white;
          padding: 80px 0;
          min-height: 100vh;
        }

        .gallery-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 40px;
        }

        .gallery-title {
          font-size: 3rem;
          text-align: center;
          margin-bottom: 60px;
          color: #333;
        }

        .city-overview-card {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          margin-bottom: 36px;
          padding: 24px;
          border-radius: 24px;
          background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
          border: 1px solid rgba(102, 126, 234, 0.12);
        }

        .overview-row {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .overview-label {
          font-size: 0.85rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 700;
        }

        .overview-value {
          font-size: 1rem;
          color: #1e293b;
          font-weight: 600;
          word-break: break-word;
        }

        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 30px;
          margin-bottom: 80px;
        }

        .memory-tools-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 24px;
          margin-bottom: 28px;
        }

        .memory-card {
          padding: 28px;
          border-radius: 24px;
          background: #ffffff;
          box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
          border: 1px solid rgba(148, 163, 184, 0.16);
        }

        .memory-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 12px;
        }

        .memory-card-header h3 {
          margin: 0;
          font-size: 1.3rem;
          color: #0f172a;
        }

        .memory-card-header span {
          font-size: 0.9rem;
          color: #6366f1;
          font-weight: 700;
        }

        .memory-card-desc {
          margin: 0 0 20px 0;
          color: #475569;
          line-height: 1.7;
        }

        .upload-inline-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 14px 22px;
          border-radius: 999px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
          font-weight: 700;
          cursor: pointer;
          border: none;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          box-shadow: 0 16px 30px rgba(102, 126, 234, 0.22);
        }

        .upload-inline-button:hover {
          transform: translateY(-2px);
        }

        .upload-inline-button.disabled {
          opacity: 0.65;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .upload-inline-button input {
          display: none;
        }

        .comment-textarea {
          width: 100%;
          min-height: 132px;
          padding: 18px 20px;
          border-radius: 18px;
          border: 1px solid rgba(148, 163, 184, 0.3);
          background: #f8fafc;
          color: #0f172a;
          font-size: 1rem;
          line-height: 1.7;
          resize: vertical;
          box-sizing: border-box;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .comment-textarea:focus {
          border-color: #818cf8;
          box-shadow: 0 0 0 4px rgba(129, 140, 248, 0.14);
        }

        .comment-action-row {
          margin-top: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .comment-author {
          color: #64748b;
          font-size: 0.95rem;
        }

        .comment-submit-button {
          padding: 12px 22px;
          border: none;
          border-radius: 999px;
          background: #111827;
          color: white;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.2s ease, opacity 0.2s ease;
        }

        .comment-submit-button:hover {
          transform: translateY(-1px);
        }

        .comment-submit-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .action-message {
          margin-bottom: 28px;
          padding: 16px 20px;
          border-radius: 18px;
          font-weight: 600;
        }

        .action-message.success {
          background: rgba(34, 197, 94, 0.12);
          color: #15803d;
          border: 1px solid rgba(34, 197, 94, 0.2);
        }

        .action-message.error {
          background: rgba(239, 68, 68, 0.1);
          color: #b91c1c;
          border: 1px solid rgba(239, 68, 68, 0.18);
        }

        .comments-section {
          margin-top: 16px;
          padding: 40px 0 12px;
          border-top: 1px solid rgba(148, 163, 184, 0.18);
        }

        .comments-title {
          margin: 0 0 24px 0;
          font-size: 2rem;
          color: #0f172a;
        }

        .comments-empty {
          padding: 32px;
          border-radius: 22px;
          background: #f8fafc;
          color: #64748b;
          text-align: center;
        }

        .comments-list {
          display: grid;
          gap: 18px;
        }

        .comment-card {
          padding: 22px 24px;
          border-radius: 22px;
          background: white;
          border: 1px solid rgba(148, 163, 184, 0.18);
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.05);
        }

        .comment-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 12px;
        }

        .comment-name {
          font-weight: 800;
          color: #111827;
        }

        .comment-time {
          font-size: 0.9rem;
          color: #94a3b8;
        }

        .comment-content {
          color: #334155;
          line-height: 1.9;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .gallery-item {
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          transition: transform 0.3s ease;
          cursor: pointer;
        }

        .gallery-item:hover {
          transform: translateY(-10px);
        }

        .gallery-item img {
          width: 100%;
          height: 250px;
          object-fit: cover;
          transition: transform 0.3s ease;
          display: block;
        }

        .gallery-item:hover img {
          transform: scale(1.05);
        }

        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateX(-50%) translateY(0);
          }
          40% {
            transform: translateX(-50%) translateY(-10px);
          }
          60% {
            transform: translateX(-50%) translateY(-5px);
          }
        }

        /* 图片查看器样式 */
        .image-viewer-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.95);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.3s ease;
        }

        .image-viewer-container {
          position: relative;
          max-width: 90vw;
          max-height: 90vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .image-viewer-img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          border-radius: 8px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }

        .image-viewer-close {
          position: absolute;
          top: -50px;
          right: -50px;
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
          z-index: 1001;
          flex-shrink: 0;
        }

        .image-viewer-close:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.1);
        }

        .image-viewer-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
          z-index: 1001;
        }

        .image-viewer-nav:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-50%) scale(1.1);
        }

        .image-viewer-nav.prev {
          left: -80px;
        }

        .image-viewer-nav.next {
          right: -80px;
        }

        .image-viewer-counter {
          position: absolute;
          bottom: -50px;
          left: 50%;
          transform: translateX(-50%);
          color: white;
          background: rgba(0, 0, 0, 0.5);
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          backdrop-filter: blur(10px);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @media (max-width: 768px) {
          .city-name {
            font-size: 4rem;
          }
          .city-description {
            font-size: 1.2rem;
          }
          .gallery-container {
            padding: 0 20px;
          }
          .gallery-grid {
            grid-template-columns: 1fr;
          }
          .memory-tools-grid {
            grid-template-columns: 1fr;
          }
          .back-button {
            top: 20px;
            left: 20px;
            padding: 8px 16px;
            font-size: 14px;
          }
          .comment-action-row {
            flex-direction: column;
            align-items: stretch;
          }
          .comment-submit-button {
            width: 100%;
          }
          .comment-meta {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .image-viewer-close {
            top: 20px;
            right: 20px;
          }
          
          .image-viewer-nav.prev {
            left: 20px;
          }
          
          .image-viewer-nav.next {
            right: 20px;
          }
          
          .image-viewer-counter {
            bottom: 20px;
          }
        }
      `}</style>
    </div>
  );
}
