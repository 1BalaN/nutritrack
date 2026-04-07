# Техническое задание  
## Мобильное приложение «NutriTrack» (Offline-first трекер КБЖУ)

**Версия:** 3.0  
**Тип проекта:** Fullstack (Frontend-oriented)  
**Архитектура:** Offline-first  
**Цель:** Production-grade приложение с упором на UX, производительность и локальную работу  

---

## 1. Цели проекта

### 1.1 Продуктовая цель
Создать мобильное приложение для трекинга питания, которое:  
- работает полностью оффлайн  
- позволяет добавлять еду за ≤ 3 секунд  
- предоставляет аналитику и инсайты  

### 1.2 Уникальные преимущества
- быстрый ввод (Quick Add)  
- интеллектуальные рекомендации (Smart Insights)  
- оценка дня (Day Score)  
- offline-first архитектура  

---

## 2. Технологический стек

### 2.1 Frontend
- React Native (Expo)  
- TypeScript  
- React Navigation  
- Zustand — глобальное состояние  
- React Query — серверное состояние  

### 2.2 Локальное хранилище (основной слой)
**SQLite + ORM**  
- SQLite (expo-sqlite или op-sqlite)  
- ORM: Drizzle ORM (рекомендуется)  

**Назначение:**  
- продукты  
- рецепты  
- история питания  
- пользовательские данные  

### 2.3 Быстрое хранилище
**react-native-mmkv**  

**Используется для:**  
- настройки пользователя  
- кэш последних продуктов  
- флаги состояния (онбординг, тема)  

### 2.4 Backend
- Firebase Firestore (синхронизация)  
- Firebase Auth  
- Firebase Storage (опционально)  

### 2.5 Внешние API
- Open Food Facts  

---

## 3. Архитектура

### 3.1 Общая схема
UI (React Native)  
→ Zustand (state)  
→ SQLite (основная БД)  
→ Sync Layer  
→ Firebase  

+ MMKV (быстрый доступ к настройкам)  

### 3.2 Слои приложения
1. **Presentation Layer**  
   - экраны  
   - компоненты  
   - анимации  

2. **State Layer**  
   - Zustand store  
   - UI state  

3. **Data Layer**  
   - ORM (Drizzle)  
   - SQLite queries  

4. **Sync Layer**  
   - синхронизация с Firebase  

---

## 4. Data Model

### 4.1 Product
- id  
- name  
- brand  
- kcal_per_100g  
- protein  
- fat  
- carbs  
- barcode  
- source  

### 4.2 MealEntry
- id  
- date  
- meal_type  
- product_id  
- grams  
- kcal  
- protein  
- fat  
- carbs  

### 4.3 Recipe
- id  
- name  
- servings  
- total_kcal  
- ingredients (relation)  

### 4.4 User
- id  
- weight  
- height  
- age  
- activity_level  
- calorie_goal  

### 4.5 LocalCache (MMKV)
- last_used_products  
- theme  
- onboarding_completed  

---

## 5. Offline-first стратегия

### 5.1 Принципы
- SQLite — источник истины  
- все операции локальные  
- UI обновляется мгновенно  

### 5.2 Синхронизация
- очередь изменений (pending changes)  
- отправка в Firebase при наличии сети  
- retry механизм  

### 5.3 Конфликты
- стратегия: last-write-wins  

---

## 6. Функциональные требования

### 6.1 Дневник питания
- календарь  
- 4 приёма пищи  
- отображение КБЖУ  

### 6.2 Добавление еды
**Способы:**  
- поиск (SQLite)  
- сканер  
- ручной ввод  
- быстрый доступ (MMKV)  

**UX требования:**  
- ≤ 3 секунд на добавление  
- автоподстановка  
- последние продукты  

### 6.3 Сканер
- barcode scanning  
- fallback логика  

### 6.4 Рецепты
- создание  
- расчёт КБЖУ  
- добавление в дневник  

### 6.5 Аналитика
**Базовая:**  
- графики  
- распределение БЖУ  

**Расширенная:**  
- Smart Insights  
- Day Score  
- тренды  

---

## 7. UX / UI требования

**Основные:**  
- one-hand usage  
- минимальное количество действий  
- быстрый отклик  

**UX элементы:**  
- optimistic UI  
- skeleton loading  
- empty states  
- undo действия  

**Анимации:**  
- добавление еды  
- переходы  
- обновление данных  

---

## 8. Нефункциональные требования
- запуск < 2 сек  
- стабильная работа оффлайн  
- отсутствие крашей  

---

## 9. Error Handling
- retry  
- fallback UI  
- обработка ошибок API  

---

## 10. Безопасность
- Firebase rules  
- валидация данных  

---

## 11. Тестирование
- unit тесты (расчёты)  
- integration тесты (основные сценарии)  

---

## 12. Этапы разработки
1. MVP  
2. Сканер  
3. Рецепты  
4. Аналитика  
5. Полировка  

---

## 13. Критерии готовности
- добавление еды  
- сканирование  
- рецепты  
- аналитика  
- оффлайн работа  

---

## 14. Дополнительные улучшения
- OCR  
- интеграция с фитнес API  
- виджеты