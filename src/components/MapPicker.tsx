import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, Check, Edit2, X, Map as MapIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Baghdad: { lat: 33.3128, lng: 44.3615 },
  Basra: { lat: 30.5081, lng: 47.7835 },
  Mosul: { lat: 36.3512, lng: 43.1531 },
  Erbil: { lat: 36.1901, lng: 44.0089 },
  Najaf: { lat: 32.0256, lng: 44.3468 },
  Karbala: { lat: 32.6160, lng: 44.0249 },
  Kirkuk: { lat: 35.4687, lng: 44.3922 },
  Sulaymaniyah: { lat: 35.5560, lng: 45.4411 },
  Hilla: { lat: 32.4846, lng: 44.4246 },
  Nasiriyah: { lat: 31.0581, lng: 46.2575 },
  Amara: { lat: 31.8494, lng: 47.1432 },
  Kut: { lat: 32.5135, lng: 45.8197 },
  Ramadi: { lat: 33.4216, lng: 43.3032 },
  Fallujah: { lat: 33.3496, lng: 43.7850 },
  Samarra: { lat: 34.1950, lng: 43.8741 },
  Duhok: { lat: 36.8687, lng: 42.9972 },
  Zakho: { lat: 37.1431, lng: 42.6878 },
  Baqubah: { lat: 33.7433, lng: 44.6468 },
};

interface MapPickerProps {
  coords: { lat: number; lng: number } | null;
  onChange: (lat: number, lng: number) => void;
  city?: string;
  workers?: any[];
}

export default function MapPicker({ coords, onChange, city, workers }: MapPickerProps) {
  const { t, i18n } = useTranslation();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  
  const [isMapMoving, setIsMapMoving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState(coords !== null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize center coords based on priority: props -> city -> Baghdad
  const getInitialCenter = (): { lat: number; lng: number } => {
    if (coords) return coords;
    
    if (city) {
      if (CITY_COORDS[city]) return CITY_COORDS[city];
      
      // Fallback if city name is in Arabic or Kurdish
      const cityMap: Record<string, string> = {
        'بغداد': 'Baghdad', 'بەغدا': 'Baghdad',
        'البصرة': 'Basra', 'بەسرە': 'Basra',
        'الموصل': 'Mosul', 'مووسڵ': 'Mosul',
        'أربيل': 'Erbil', 'هەولێر': 'Erbil',
        'النجف': 'Najaf', 'نەجەف': 'Najaf',
        'كربلاء': 'Karbala', 'کەربەلا': 'Karbala',
        'كركوك': 'Kirkuk', 'کەرکووک': 'Kirkuk',
        'السليمانية': 'Sulaymaniyah', 'سلێمانی': 'Sulaymaniyah',
        'الحلة': 'Hilla', 'حیللە': 'Hilla',
        'الناصرية': 'Nasiriyah', 'ناسریە': 'Nasiriyah',
        'العمارة': 'Amara', 'عەمارە': 'Amara',
        'الكوت': 'Kut', 'کوت': 'Kut',
        'الرمادي': 'Ramadi', 'ڕەمادی': 'Ramadi',
        'الفلوجة': 'Fallujah', 'فەلووجە': 'Fallujah',
        'سامراء': 'Samarra', 'سامەڕا': 'Samarra',
        'دهوك': 'Duhok', 'دهۆک': 'Duhok',
        'زاخو': 'Zakho', 'زاخۆ': 'Zakho',
        'بعقوبة': 'Baqubah', 'بایەقوبە': 'Baqubah'
      };

      if (cityMap[city]) {
        const engCity = cityMap[city];
        if (CITY_COORDS[engCity]) return CITY_COORDS[engCity];
      }
    }

    return CITY_COORDS.Baghdad;
  };

  const [currentCenter, setCurrentCenter] = useState<{ lat: number; lng: number }>(getInitialCenter);

  useEffect(() => {
    if (currentCenter) {
      setManualLat(currentCenter.lat.toFixed(6));
      setManualLng(currentCenter.lng.toFixed(6));
    }
  }, [currentCenter]);

  // When modal is opened, initialize Map. Doing it inside useEffect when isModalOpen is true ensures the DOM elements are loaded
  useEffect(() => {
    if (!isModalOpen) {
      // Cleanup when closed
      if (mapRef.current) {
        mapRef.current.off();
        mapRef.current.remove();
        mapRef.current = null;
      }
      return;
    }

    // Short timeout to guarantee modal container is fully rendered to prevent grey tile layout bug
    const initTimeout = setTimeout(() => {
      if (!mapContainerRef.current || mapRef.current) return;

      const initialPos = getInitialCenter();
      
      // Initialize standard Leaflet Map centered on resolved city coords
      const map = L.map(mapContainerRef.current, {
        center: [initialPos.lat, initialPos.lng],
        zoom: 14,
        zoomControl: false,
        attributionControl: false,
      });

      // Add high-resolution standard OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
      }).addTo(map);

      // Track map states and center
      map.on('movestart', () => {
        setIsMapMoving(true);
      });

      map.on('move', () => {
        const center = map.getCenter();
        setCurrentCenter({ lat: center.lat, lng: center.lng });
      });

      map.on('moveend', () => {
        setIsMapMoving(false);
        const center = map.getCenter();
        setCurrentCenter({ lat: center.lat, lng: center.lng });
      });

      mapRef.current = map;

      if (workers && workers.length > 0) {
        workers.forEach(w => {
          if (w.location && typeof w.location.lat === 'number' && typeof w.location.lng === 'number') {
            const workerIcon = L.divIcon({
              html: `
                <div class="relative flex flex-col items-center">
                  <div class="w-10 h-10 rounded-full border-2 border-emerald-500 bg-white overflow-hidden shadow-md flex items-center justify-center">
                    ${w.photoURL ? `<img src="${w.photoURL}" class="w-full h-full object-cover" referrerpolicy="no-referrer" />` : `<span class="text-xs">👤</span>`}
                  </div>
                  <div class="bg-zinc-900 border border-zinc-800 text-white font-bold text-[9px] px-1.5 py-0.5 mt-0.5 rounded shadow-sm whitespace-nowrap select-none max-w-[80px] truncate">
                    ${w.name}
                  </div>
                </div>
              `,
              className: 'custom-worker-pin-container',
              iconSize: [40, 60],
              iconAnchor: [20, 20]
            });

            const marker = L.marker([w.location.lat, w.location.lng], { icon: workerIcon }).addTo(map);
            
            const popupContent = `
              <div class="p-2 text-center font-sans">
                <div class="w-12 h-12 rounded-full overflow-hidden mx-auto mb-1 border-2 border-emerald-500 flex items-center justify-center">
                  ${w.photoURL ? `<img src="${w.photoURL}" class="w-full h-full object-cover" referrerpolicy="no-referrer" />` : `<span class="text-lg">👤</span>`}
                </div>
                <h4 class="font-bold text-xs text-zinc-900">${w.name}</h4>
                <p class="text-[10px] text-emerald-600 font-bold">${t(w.profession) || ''}</p>
                <p class="text-[9px] text-gray-500">${t(w.city) || ''}</p>
              </div>
            `;
            marker.bindPopup(popupContent);
          }
        });
      }

      // Invalidate layout after load to render completely
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(initTimeout);
      if (mapRef.current) {
        mapRef.current.off();
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isModalOpen]);

  // Handle GPS location tracking query
  const handleGPSLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (mapRef.current) {
          mapRef.current.flyTo([latitude, longitude], 15, { duration: 1.5 });
        }
      },
      (error) => {
        console.error("GPS location error:", error);
      }
    );
  };

  const handleSelectLocation = () => {
    onChange(currentCenter.lat, currentCenter.lng);
    setSelected(true);
    setIsModalOpen(false);
  };

  const handleOpenMap = () => {
    // Reset starting point to match coordinates (or city default)
    setCurrentCenter(getInitialCenter());
    setIsModalOpen(true);
  };

  // Sync coords from parent
  useEffect(() => {
    if (coords) {
      setSelected(true);
    } else {
      setSelected(false);
    }
  }, [coords]);

  const isArabic = i18n.language === 'ar';
  const isKurdish = i18n.language === 'ku';

  // Customized translations
  const chooseYourLocationBtnText = isArabic 
    ? 'اختر موقعك' 
    : isKurdish 
    ? 'شوێنەکەت هەڵبژێرە' 
    : 'Choose Your Location';

  const pressToChooseText = isArabic 
    ? 'اضغط هنا لتحديد الموقع' 
    : isKurdish 
    ? 'بۆ دیاریکردنی شوێنەکە لێرە دابگرە' 
    : 'Press here to choose this location';

  const locationSelectedText = isArabic
    ? 'تم تحديد الموقع بنجاح'
    : isKurdish
    ? 'شوێنەکە بە سەرکەوتوویی دیاریکرا'
    : 'Location Selected Successfully';

  const changeLocationText = isArabic
    ? 'تعديل الموقع'
    : isKurdish
    ? 'گۆڕینی شوێنەکە'
    : 'Change Location';

  const locationPickedTitle = isArabic
    ? 'تحديد موقع تقديم الخدمة'
    : isKurdish
    ? 'دیاریکردنی شوێنی پێشکەشکردنی خزمەتگوزاری'
    : 'Choose Service Delivery Location';

  const closeButtonText = isArabic
    ? 'إغلاق'
    : isKurdish
    ? 'داخستن'
    : 'Close';

  return (
    <div className="w-full space-y-3">
      {/* 1. Normal/Init State: Show NO map. Show either Selected Box OR Green Button */}
      {selected && coords ? (
        <div className="w-full p-4 bg-green-50 dark:bg-green-950/20 border-2 border-green-200 dark:border-green-800 rounded-3xl flex items-center justify-between transition-all duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-green-500/20">
              <Check size={20} className="stroke-[3]" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-green-800 dark:text-green-300">
                {locationSelectedText}
              </span>
              <span className="text-xs text-green-600 dark:text-green-400 font-mono">
                {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleOpenMap}
            className="p-3 bg-white dark:bg-zinc-900 border border-green-200 dark:border-green-800 rounded-2xl text-green-700 dark:text-green-400 hover:bg-green-100 transition-colors flex items-center gap-2 text-xs font-black shadow-sm"
          >
            <Edit2 size={13} />
            {changeLocationText}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleOpenMap}
          className="w-full p-5 bg-green-500 hover:bg-green-600 text-white rounded-[24px] flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:scale-[1.01] transform transition-all font-black text-base md:text-lg duration-200"
        >
          <MapIcon size={24} className="stroke-[2.5]" />
          <span>{chooseYourLocationBtnText}</span>
        </button>
      )}

      {/* 2. Full-Screen Map Modal / Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 w-full h-full z-[9999] bg-white dark:bg-zinc-950 flex flex-col animate-fade-in">
          {/* Top Elegant bar */}
          <div className="w-full bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-green-500 bg-opacity-10 dark:bg-opacity-20 flex items-center justify-center text-green-500">
                <MapPin size={18} />
              </div>
              <h3 className="text-base font-black text-gray-800 dark:text-zinc-100 truncate max-w-[240px] md:max-w-none">
                {locationPickedTitle}
              </h3>
            </div>
            
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="p-2 text-gray-400 dark:text-zinc-400 hover:text-gray-600 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold"
            >
              <X size={20} />
              <span className="hidden sm:inline">{closeButtonText}</span>
            </button>
          </div>

          {/* Leaflet Map Viewer / Offline manual tuner (Takes full remaining space) */}
          <div className="flex-1 w-full relative overflow-hidden bg-gray-50 dark:bg-zinc-900">
            {!isOnline ? (
              <div className="w-full h-full overflow-y-auto p-4 md:p-8 flex flex-col items-center justify-center bg-gray-50 dark:bg-zinc-950">
                {/* Offline Mode Alert banner */}
                <div className="max-w-2xl w-full bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-400 p-5 rounded-3xl mb-6 flex items-start gap-4 animate-fade-in text-start">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                    <span className="text-xl">⚠️</span>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm sm:text-base">
                      {isArabic ? "تم تفعيل وضع عدم الاتصال" : isKurdish ? "دۆخی دەرەوەی هێڵ چالاککرا" : "Offline Mode Active"}
                    </h4>
                    <p className="text-xs mt-1.5 text-zinc-600 dark:text-zinc-400 font-semibold leading-relaxed">
                      {isArabic 
                        ? "أنت غير متصل بالإنترنت حالياً. لتسهيل تحديد موقع الخدمة، اختر أحد مراكز المدن العراقية أدناه أو أدخل الإحداثيات يدوياً للاستمرار." 
                        : isKurdish 
                          ? "تۆ لە هێڵ دابڕاوی. دەتوانی ڕێکخستنی شوێن بە دەستی بنووسی یان ناوەندێکی شار هەڵبژێری بۆ بەردەوامبوون." 
                          : "You are disconnected. To easily map your service, choose an Iraqi city center below or manually enter coordinates."}
                    </p>
                  </div>
                </div>

                <div className="max-w-2xl w-full grid grid-cols-1 md:grid-cols-2 gap-6 text-start">
                  {/* City grids */}
                  <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-5 shadow-sm">
                    <h4 className="text-xs font-black text-gray-400 dark:text-zinc-500 block uppercase mb-4 tracking-wider">
                      {isArabic ? "اختر مركز مدينة عراقية:" : isKurdish ? "ناوەندی شاره‌کان لە عێراق:" : "Select Iraqi City Center:"}
                    </h4>
                    <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                      {Object.keys(CITY_COORDS).map((cityName) => {
                        const localcityName = isArabic 
                          ? (cityName === 'Baghdad' ? 'بغداد' : cityName === 'Basra' ? 'البصرة' : cityName === 'Mosul' ? 'الموصل' : cityName === 'Erbil' ? 'أربيل' : cityName === 'Najaf' ? 'النجف' : cityName === 'Karbala' ? 'كربلاء' : cityName === 'Kirkuk' ? 'كركوك' : cityName === 'Sulaymaniyah' ? 'السليمانية' : cityName)
                          : cityName;
                        const isSelected = Math.abs(currentCenter.lat - CITY_COORDS[cityName].lat) < 0.001 && Math.abs(currentCenter.lng - CITY_COORDS[cityName].lng) < 0.001;
                        return (
                          <button
                            key={cityName}
                            type="button"
                            onClick={() => setCurrentCenter(CITY_COORDS[cityName])}
                            className={`py-3 px-3 rounded-2xl text-xs font-black text-center border transition-all ${
                              isSelected 
                                ? 'bg-green-500 text-white border-green-500 shadow-md shadow-green-500/20' 
                                : 'bg-gray-50 dark:bg-zinc-950 text-gray-700 dark:text-zinc-300 border-gray-200/60 dark:border-zinc-800/85 hover:bg-gray-100 dark:hover:bg-zinc-800'
                            }`}
                          >
                            {localcityName}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Manual coordinates tweak */}
                  <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-black text-gray-400 dark:text-zinc-500 block uppercase mb-4 tracking-wider">
                        {isArabic ? "تعديل يدوي للإحداثيات:" : isKurdish ? "دەستکاریکردنی دەستی:" : "Manual Coordinates:"}
                      </h4>
                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest block mb-1">
                            {isArabic ? "خط العرض (Lat):" : isKurdish ? "پانی (Lat):" : "Latitude (Lat):"}
                          </label>
                          <input
                            type="text"
                            value={manualLat}
                            onChange={(e) => {
                              setManualLat(e.target.value);
                              const parsed = parseFloat(e.target.value);
                              if (!isNaN(parsed)) {
                                setCurrentCenter(prev => ({ ...prev, lat: parsed }));
                              }
                            }}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-950 border border-gray-200/60 dark:border-zinc-800/80 rounded-2xl text-sm font-semibold focus:outline-none focus:border-green-500 transition-colors dark:text-zinc-100"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest block mb-1">
                            {isArabic ? "خط الطول (Lng):" : isKurdish ? "درێژی (Lng):" : "Longitude (Lng):"}
                          </label>
                          <input
                            type="text"
                            value={manualLng}
                            onChange={(e) => {
                              setManualLng(e.target.value);
                              const parsed = parseFloat(e.target.value);
                              if (!isNaN(parsed)) {
                                setCurrentCenter(prev => ({ ...prev, lng: parsed }));
                              }
                            }}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-950 border border-gray-200/60 dark:border-zinc-800/80 rounded-2xl text-sm font-semibold focus:outline-none focus:border-green-500 transition-colors dark:text-zinc-100"
                          />
                        </div>
                      </div>
                    </div>

                    <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-bold leading-relaxed mt-4">
                      {isArabic 
                        ? "ملاحظة: يمكنك إرسال موقع تقريبي الآن وتعديل العنوان التفصيلي نصياً مع العامل في المحادثة لاحقاً." 
                        : "Note: You can submit approximate coordinates now and specify your exact street address directly in chat sessions."}
                    </p>
                  </div>
                </div>

                <div className="max-w-2xl w-full mt-6">
                  <button
                    type="button"
                    onClick={handleSelectLocation}
                    className="w-full bg-green-500 hover:bg-green-600 text-white py-4.5 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all transform active:scale-98 flex items-center justify-center gap-2.5 text-base font-black uppercase tracking-wider"
                  >
                    <Check size={20} className="stroke-[3]" />
                    <span>{isArabic ? "تأكيد واستخدام هذا الموقع" : isKurdish ? "تەئکیدکردنەوەی شوێن" : "Confirm & Use This Location"}</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Map Canvas */}
                <div ref={mapContainerRef} className="w-full h-full z-0" />

                {/* Absolute Stationary pin in the middle of Map */}
                <div 
                  className={`absolute top-1/2 left-1/2 -ml-5 -mt-10 pointer-events-none z-[1000] flex flex-col items-center transition-transform duration-200 ${
                    isMapMoving ? 'scale-110 -translate-y-2' : ''
                  }`}
                >
                  <div className="relative flex flex-col items-center">
                    <MapPin 
                      className="text-green-500 filter drop-shadow-md" 
                      size={44} 
                      fill="#22c55e" 
                      color="white"
                    />
                    <div 
                      className={`w-2 h-1 bg-black/30 rounded-full blur-xs transition-opacity duration-200 ${
                        isMapMoving ? 'opacity-40 scale-50' : 'opacity-100'
                      }`} 
                    />
                  </div>
                </div>

                {/* GPS Tracker Smooth Action button */}
                <button
                  type="button"
                  onClick={handleGPSLocation}
                  className="absolute top-4 right-4 z-[1000] p-4 bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-200 rounded-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all border border-gray-100 dark:border-zinc-800 flex items-center justify-center"
                  title="My Location"
                >
                  <Navigation size={20} className="rotate-45" />
                </button>

                {/* Bottom floating button banner */}
                <div className="absolute bottom-8 left-0 right-0 px-4 z-[1000] flex justify-center">
                  <button
                    type="button"
                    onClick={handleSelectLocation}
                    className="w-full max-w-sm md:max-w-md bg-green-500 hover:bg-green-600 text-white py-4 px-6 rounded-2xl shadow-3xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2.5 text-sm md:text-base font-black border border-white/20 animate-pulse uppercase tracking-wider"
                  >
                    <Check size={20} className="stroke-[3]" />
                    <span>{pressToChooseText}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
