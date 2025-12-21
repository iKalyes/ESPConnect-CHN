/**
 * ESPConnect 国际化核心模块
 * 
 * 这是一个独立的翻译系统，通过 MutationObserver 监听 DOM 变化
 * 实现自动翻译，无需修改 Vue 组件源码
 */

import { 
  translations, 
  regexTranslations, 
  excludeSelectors,
  skipPatterns,
  setLanguage,
  getLanguage 
} from './translations.js';

// 构建反向翻译字典（中文 -> 英文）
const reverseTranslations = {};
for (const [en, zh] of Object.entries(translations)) {
  reverseTranslations[zh] = en;
}

/**
 * 检查文本是否应该跳过翻译
 */
function shouldSkipText(text) {
  if (!text || typeof text !== 'string') return true;
  const trimmed = text.trim();
  if (!trimmed) return true;
  
  // 检查是否匹配跳过模式（如芯片型号）
  for (const pattern of skipPatterns) {
    if (pattern.test(trimmed)) {
      return true;
    }
  }
  return false;
}

/**
 * 翻译单个文本（英文 -> 中文）
 */
function translateText(text) {
  if (!text || typeof text !== 'string') return text;
  
  const trimmed = text.trim();
  if (!trimmed) return text;

  // 检查是否应该跳过
  if (shouldSkipText(text)) {
    return text;
  }

  // 先尝试精确匹配
  if (translations[trimmed]) {
    return text.replace(trimmed, translations[trimmed]);
  }

  // 再尝试正则匹配
  for (const rule of regexTranslations) {
    if (rule.pattern.test(trimmed)) {
      const translated = trimmed.replace(rule.pattern, rule.replacement);
      return text.replace(trimmed, translated);
    }
  }

  // 如果文本包含换行符，尝试分行翻译
  if (trimmed.includes('\n')) {
    const lines = text.split('\n');
    let hasTranslation = false;
    const translatedLines = lines.map(line => {
      const lineTrimmed = line.trim();
      if (!lineTrimmed) return line;
      
      // 精确匹配
      if (translations[lineTrimmed]) {
        hasTranslation = true;
        return line.replace(lineTrimmed, translations[lineTrimmed]);
      }
      
      // 正则匹配
      for (const rule of regexTranslations) {
        if (rule.pattern.test(lineTrimmed)) {
          hasTranslation = true;
          const translated = lineTrimmed.replace(rule.pattern, rule.replacement);
          return line.replace(lineTrimmed, translated);
        }
      }
      
      return line;
    });
    
    if (hasTranslation) {
      return translatedLines.join('\n');
    }
  }

  return text;
}

/**
 * 反向翻译文本（中文 -> 英文）
 */
function reverseTranslateText(text) {
  if (!text || typeof text !== 'string') return text;
  
  const trimmed = text.trim();
  if (!trimmed) return text;

  // 检查是否应该跳过
  if (shouldSkipText(text)) {
    return text;
  }

  // 尝试反向精确匹配
  if (reverseTranslations[trimmed]) {
    return text.replace(trimmed, reverseTranslations[trimmed]);
  }

  // 对于正则翻译，尝试反向匹配一些常见模式
  // "3 项能力" -> "3 capabilities"
  const capabilitiesMatch = trimmed.match(/^(\d+)\s*项能力$/);
  if (capabilitiesMatch) {
    return text.replace(trimmed, `${capabilitiesMatch[1]} capabilities`);
  }

  // "3 项功能" -> "3 capabilities"
  const capabilitiesMatch2 = trimmed.match(/^(\d+)\s*项功能$/);
  if (capabilitiesMatch2) {
    return text.replace(trimmed, `${capabilitiesMatch2[1]} capabilities`);
  }

  // "+5 更多" -> "+5 more"
  const moreMatch = trimmed.match(/^\+(\d+)\s*更多$/);
  if (moreMatch) {
    return text.replace(trimmed, `+${moreMatch[1]} more`);
  }

  // "晶振 40MHz" -> "Crystal 40MHz"
  const crystalMatch = trimmed.match(/^晶振\s+(.+)$/);
  if (crystalMatch) {
    return text.replace(trimmed, `Crystal ${crystalMatch[1]}`);
  }

  // CH340 波特率提示反向翻译
  const ch340Match = trimmed.match(/^检测到 CH340 桥接芯片；为保证稳定性，已将波特率降低至 (\d+) bps。$/);
  if (ch340Match) {
    return text.replace(trimmed, `Detected CH340 bridge; lowering baud to ${ch340Match[1]} bps for stability.`);
  }

  // "最后错误: xxx" -> "Last error: xxx"
  const lastErrorMatch = trimmed.match(/^最后错误:\s*(.+)$/);
  if (lastErrorMatch) {
    return text.replace(trimmed, `Last error: ${lastErrorMatch[1]}`);
  }

  // "分区表 · 8MB" -> "Partitions · 8MB"
  const partitionsMatch = trimmed.match(/^分区表\s*·\s*(.+)$/);
  if (partitionsMatch) {
    return text.replace(trimmed, `Partitions · ${partitionsMatch[1]}`);
  }

  // "检测到未使用的 Flash - 约 8 MB（8,388,608 字节）可回收。" -> "Unused flash detected - about 8 MB (8,388,608 bytes) is reclaimable."
  const unusedFlashMatch = trimmed.match(/^检测到未使用的 Flash - 约 (.+?)（(.+?) 字节）可回收。$/);
  if (unusedFlashMatch) {
    return text.replace(trimmed, `Unused flash detected - about ${unusedFlashMatch[1]} (${unusedFlashMatch[2]} bytes) is reclaimable.`);
  }

  // "活动槽位: 出厂 (回退)" -> "Active slot: factory (fallback)"
  // 更新为新术语
  const activeSlotFallbackMatch = trimmed.match(/^当前启动分区:\s*factory\s*\(回退\)$/);
  if (activeSlotFallbackMatch) {
    return text.replace(trimmed, 'Active slot: factory (fallback)');
  }

  // "当前启动分区: factory" -> "Active slot: factory"
  const activeSlotFactoryMatch = trimmed.match(/^当前启动分区:\s*factory$/);
  if (activeSlotFactoryMatch) {
    return text.replace(trimmed, 'Active slot: factory');
  }

  // "当前启动分区: ota_0" -> "Active slot: ota_0"
  const activeSlotOtaMatch = trimmed.match(/^当前启动分区:\s*ota_(\d+)$/);
  if (activeSlotOtaMatch) {
    return text.replace(trimmed, `Active slot: ota_${activeSlotOtaMatch[1]}`);
  }

  // "当前启动分区: xxx (回退)" -> "Active slot: xxx (fallback)"
  const activeSlotGenericFallbackMatch = trimmed.match(/^当前启动分区:\s*(.+?)\s*\(回退\)$/);
  if (activeSlotGenericFallbackMatch) {
    return text.replace(trimmed, `Active slot: ${activeSlotGenericFallbackMatch[1]} (fallback)`);
  }

  // "当前启动分区: xxx" -> "Active slot: xxx"
  const activeSlotGenericMatch = trimmed.match(/^当前启动分区:\s*(.+)$/);
  if (activeSlotGenericMatch) {
    return text.replace(trimmed, `Active slot: ${activeSlotGenericMatch[1]}`);
  }

  // "推断启动分区: ota_0。" -> "Active slot inferred: ota_0."
  const activeSlotInferredOtaMatch = trimmed.match(/^推断启动分区:\s*ota_(\d+)。$/);
  if (activeSlotInferredOtaMatch) {
    return text.replace(trimmed, `Active slot inferred: ota_${activeSlotInferredOtaMatch[1]}.`);
  }

  // "推断启动分区: factory。" -> "Active slot inferred: factory."
  const activeSlotInferredFactoryMatch = trimmed.match(/^推断启动分区:\s*factory。$/);
  if (activeSlotInferredFactoryMatch) {
    return text.replace(trimmed, 'Active slot inferred: factory.');
  }

  // "推断启动分区: xxx。" -> "Active slot inferred: xxx."
  const activeSlotInferredGenericMatch = trimmed.match(/^推断启动分区:\s*(.+)。$/);
  if (activeSlotInferredGenericMatch) {
    return text.replace(trimmed, `Active slot inferred: ${activeSlotInferredGenericMatch[1]}.`);
  }

  // "当前启动分区 ota_0 无效。切换至 ota_1。" -> "Active slot ota_0 invalid. Using ota_1."
  const activeSlotInvalidOtaMatch = trimmed.match(/^当前启动分区\s+ota_(\d+)\s+无效。切换至\s+ota_(\d+)。$/);
  if (activeSlotInvalidOtaMatch) {
    return text.replace(trimmed, `Active slot ota_${activeSlotInvalidOtaMatch[1]} invalid. Using ota_${activeSlotInvalidOtaMatch[2]}.`);
  }

  // "当前启动分区 xxx 无效。切换至 yyy。" -> "Active slot xxx invalid. Using yyy."
  const activeSlotInvalidGenericMatch = trimmed.match(/^当前启动分区\s+(.+?)\s+无效。切换至\s+(.+)。$/);
  if (activeSlotInvalidGenericMatch) {
    return text.replace(trimmed, `Active slot ${activeSlotInvalidGenericMatch[1]} invalid. Using ${activeSlotInvalidGenericMatch[2]}.`);
  }

  // "当前启动分区无效。" -> "Active slot invalid."
  if (trimmed === '当前启动分区无效。') {
    return text.replace(trimmed, 'Active slot invalid.');
  }

  // "偏移 0x10000 • 大小 1.5 MB" -> "Offset 0x10000 • Size 1.5 MB"
  const offsetSizeMatch = trimmed.match(/^偏移\s+(0x[0-9a-fA-F]+)\s*•\s*大小\s+(.+)$/);
  if (offsetSizeMatch) {
    return text.replace(trimmed, `Offset ${offsetSizeMatch[1]} • Size ${offsetSizeMatch[2]}`);
  }

  // ==================== 文件系统写入确认框反向翻译 ====================
  // "新增: filename.txt (10.4 KB)" -> "Added: filename.txt (10.4 KB)"
  const addedMatch = trimmed.match(/^新增:\s*(.+)$/);
  if (addedMatch) {
    return text.replace(trimmed, `Added: ${addedMatch[1]}`);
  }
  
  // "修改: filename.txt (10.4 KB)" -> "Modified: filename.txt (10.4 KB)"
  const modifiedMatch = trimmed.match(/^修改:\s*(.+)$/);
  if (modifiedMatch) {
    return text.replace(trimmed, `Modified: ${modifiedMatch[1]}`);
  }
  
  // "移除: filename.txt" -> "Removed: filename.txt"
  const removedMatch = trimmed.match(/^移除:\s*(.+)$/);
  if (removedMatch) {
    return text.replace(trimmed, `Removed: ${removedMatch[1]}`);
  }

  // "已使用 45%（1.2 MB / 2.8 MB）" -> "Used 45% (1.2 MB / 2.8 MB)"
  const usedPercentMatch = trimmed.match(/^已使用\s+(\d+)%（(.+?)\s*\/\s*(.+?)）$/);
  if (usedPercentMatch) {
    return text.replace(trimmed, `Used ${usedPercentMatch[1]}% (${usedPercentMatch[2]} / ${usedPercentMatch[3]})`);
  }

  // "X 个文件" -> "X files"
  const filesMatch = trimmed.match(/^(\d+)\s*个文件$/);
  if (filesMatch) {
    return text.replace(trimmed, `${filesMatch[1]} files`);
  }

  // "X 个文件夹" -> "X folders"
  const foldersMatch = trimmed.match(/^(\d+)\s*个文件夹$/);
  if (foldersMatch) {
    return text.replace(trimmed, `${foldersMatch[1]} folders`);
  }

  // "X / Y 个文件" -> "X of Y files"
  const filesOfMatch = trimmed.match(/^(\d+)\s*\/\s*(\d+)\s*个文件$/);
  if (filesOfMatch) {
    return text.replace(trimmed, `${filesOfMatch[1]} of ${filesOfMatch[2]} files`);
  }
  
  // "已加载 X 个文件。" -> "Loaded X files."
  const loadedFilesMatch = trimmed.match(/^已加载\s*(\d+)\s*个文件。$/);
  if (loadedFilesMatch) {
    const count = parseInt(loadedFilesMatch[1], 10);
    return text.replace(trimmed, count === 1 ? 'Loaded 1 file.' : `Loaded ${count} files.`);
  }
  
  // "恢复文件必须正好为 1.5 MB。" -> "Restore file must be exactly 1.5 MB."
  const restoreSizeMatch = trimmed.match(/^恢复文件必须正好为\s*(.+)。$/);
  if (restoreSizeMatch) {
    return text.replace(trimmed, `Restore file must be exactly ${restoreSizeMatch[1]}.`);
  }

  // ==================== 文件系统分区标题反向翻译 ====================
  // "SPIFFS 分区 · 1.5 MB" -> "SPIFFS Partition · 1.5 MB"
  const spiffsPartitionMatch = trimmed.match(/^SPIFFS 分区\s*·\s*(.+)$/);
  if (spiffsPartitionMatch) {
    return text.replace(trimmed, `SPIFFS Partition · ${spiffsPartitionMatch[1]}`);
  }
  
  // "LittleFS 分区 · 1.5 MB" -> "LittleFS Partition · 1.5 MB"
  const littlefsPartitionMatch = trimmed.match(/^LittleFS 分区\s*·\s*(.+)$/);
  if (littlefsPartitionMatch) {
    return text.replace(trimmed, `LittleFS Partition · ${littlefsPartitionMatch[1]}`);
  }
  
  // "FATFS 分区 · 1.5 MB" -> "FATFS Partition · 1.5 MB"
  const fatfsPartitionMatch = trimmed.match(/^FATFS 分区\s*·\s*(.+)$/);
  if (fatfsPartitionMatch) {
    return text.replace(trimmed, `FATFS Partition · ${fatfsPartitionMatch[1]}`);
  }
  
  // "SPIFFS 分区" -> "SPIFFS Partition"
  if (trimmed === 'SPIFFS 分区') {
    return text.replace(trimmed, 'SPIFFS Partition');
  }
  if (trimmed === 'LittleFS 分区') {
    return text.replace(trimmed, 'LittleFS Partition');
  }
  if (trimmed === 'FATFS 分区') {
    return text.replace(trimmed, 'FATFS Partition');
  }
  
  // ==================== 文件类型过滤器反向翻译 ====================
  // "所有类型 (10)" -> "All types (10)"
  const allTypesMatch = trimmed.match(/^所有类型\s*\((\d+)\)$/);
  if (allTypesMatch) {
    return text.replace(trimmed, `All types (${allTypesMatch[1]})`);
  }
  
  // "文本 (5)" -> "Text (5)"
  const textTypesMatch = trimmed.match(/^文本\s*\((\d+)\)$/);
  if (textTypesMatch) {
    return text.replace(trimmed, `Text (${textTypesMatch[1]})`);
  }
  
  // "图片 (3)" -> "Images (3)"
  const imagesTypesMatch = trimmed.match(/^图片\s*\((\d+)\)$/);
  if (imagesTypesMatch) {
    return text.replace(trimmed, `Images (${imagesTypesMatch[1]})`);
  }
  
  // "音频 (2)" -> "Audio (2)"
  const audioTypesMatch = trimmed.match(/^音频\s*\((\d+)\)$/);
  if (audioTypesMatch) {
    return text.replace(trimmed, `Audio (${audioTypesMatch[1]})`);
  }
  
  // "其他 (1)" -> "Other (1)"
  const otherTypesMatch = trimmed.match(/^其他\s*\((\d+)\)$/);
  if (otherTypesMatch) {
    return text.replace(trimmed, `Other (${otherTypesMatch[1]})`);
  }
  
  // ==================== 文件系统消息反向翻译 ====================
  // "未检测到文件。上传或恢复 SPIFFS 镜像以开始。"
  const noFilesMatch = trimmed.match(/^未检测到文件。上传或恢复 (SPIFFS|LittleFS|FATFS) 镜像以开始。$/);
  if (noFilesMatch) {
    return text.replace(trimmed, `No files detected. Upload or restore a ${noFilesMatch[1]} image to begin.`);
  }
  
  // "SPIFFS 加载已取消。使用"读取"重新获取分区。"
  const loadCancelledMatch = trimmed.match(/^(SPIFFS|LittleFS|FATFS) 加载已取消。使用"读取"重新获取分区。$/);
  if (loadCancelledMatch) {
    return text.replace(trimmed, `${loadCancelledMatch[1]} load cancelled. Use "Read" to fetch the partition again.`);
  }
  
  // "SPIFFS 处于只读模式。更改无法保存。"
  const readOnlyMatch = trimmed.match(/^(SPIFFS|LittleFS|FATFS) 处于只读模式。(.+)$/);
  if (readOnlyMatch) {
    return text.replace(trimmed, `${readOnlyMatch[1]} is in read-only mode. ${readOnlyMatch[2]}`);
  }
  
  // "空闲 1.5 MB" -> "Free 1.5 MB"
  const freeMatch = trimmed.match(/^空闲\s+(.+)$/);
  if (freeMatch) {
    return text.replace(trimmed, `Free ${freeMatch[1]}`);
  }
  
  // ==================== 进度标签反向翻译 ====================
  // "正在读取 xxx - 123,456 / 789,012 字节" -> "Reading xxx - 123,456 of 789,012 bytes"
  const readingBytesMatch = trimmed.match(/^正在读取 (.+?)\s*-\s*([\d,]+)\s*\/\s*([\d,]+)\s*字节$/);
  if (readingBytesMatch) {
    return text.replace(trimmed, `Reading ${readingBytesMatch[1]} - ${readingBytesMatch[2]} of ${readingBytesMatch[3]} bytes`);
  }
  
  // "正在停止读取 xxx（等待当前块完成）... (123 / 456 字节)" -> "Stopping read of xxx after current chunk... (123 of 456 bytes)"
  const stoppingReadMatch = trimmed.match(/^正在停止读取 (.+?)（等待当前块完成）\.{3}\s*\(([\d,]+)\s*\/\s*([\d,]+)\s*字节\)$/);
  if (stoppingReadMatch) {
    return text.replace(trimmed, `Stopping read of ${stoppingReadMatch[1]} after current chunk... (${stoppingReadMatch[2]} of ${stoppingReadMatch[3]} bytes)`);
  }
  
  // "正在停止加载 LittleFS..." -> "Stopping LittleFS load..."
  const stoppingLoadMatch = trimmed.match(/^正在停止加载 (SPIFFS|LittleFS|FATFS)\.{3}$/);
  if (stoppingLoadMatch) {
    return text.replace(trimmed, `Stopping ${stoppingLoadMatch[1]} load...`);
  }
  
  // "正在写入 xxx... 123,456 / 789,012 字节" -> "Writing xxx... 123,456 / 789,012 bytes"
  const writingBytesMatch = trimmed.match(/^正在写入 (.+?)\.{3}\s*([\d,]+)\s*\/\s*([\d,]+)\s*字节$/);
  if (writingBytesMatch) {
    return text.replace(trimmed, `Writing ${writingBytesMatch[1]}... ${writingBytesMatch[2]} / ${writingBytesMatch[3]} bytes`);
  }
  
  // "正在读取 LittleFS @ 921600 bps..." -> "Reading LittleFS @ 921600 bps..."
  // "正在读取 LittleFS..." -> "Reading LittleFS..."
  const readingLittlefsMatch = trimmed.match(/^正在读取 LittleFS\s*(@\s*[\d,]+\s*bps)?\.{3}$/);
  if (readingLittlefsMatch) {
    const baud = readingLittlefsMatch[1] || '';
    return text.replace(trimmed, `Reading LittleFS${baud}...`);
  }
  
  const readingSpiffsMatch = trimmed.match(/^正在读取 SPIFFS\s*(@\s*[\d,]+\s*bps)?\.{3}$/);
  if (readingSpiffsMatch) {
    const baud = readingSpiffsMatch[1] || '';
    return text.replace(trimmed, `Reading SPIFFS${baud}...`);
  }
  
  const readingFatfsMatch = trimmed.match(/^正在读取 FATFS\s*(@\s*[\d,]+\s*bps)?\.{3}$/);
  if (readingFatfsMatch) {
    const baud = readingFatfsMatch[1] || '';
    return text.replace(trimmed, `Reading FATFS${baud}...`);
  }
  
  // "正在读取 xxx @ 921600 bps..." -> "Reading xxx @ 921600 bps..."
  const readingPartitionMatch = trimmed.match(/^正在读取 (.+?) @ ([\d,]+) bps\.{3}$/);
  if (readingPartitionMatch) {
    return text.replace(trimmed, `Reading ${readingPartitionMatch[1]} @ ${readingPartitionMatch[2]} bps...`);
  }
  
  // "正在读取 SPIFFS @ 0x290000 @ 921600 bps..." -> "Reading SPIFFS @ 0x290000 @ 921600 bps..."
  const readingFsAddrBaudMatch = trimmed.match(/^正在读取 (SPIFFS|LittleFS|FATFS) @ (0x[0-9a-fA-F]+) @ ([\d,]+) bps\.{3}$/);
  if (readingFsAddrBaudMatch) {
    return text.replace(trimmed, `Reading ${readingFsAddrBaudMatch[1]} @ ${readingFsAddrBaudMatch[2]} @ ${readingFsAddrBaudMatch[3]} bps...`);
  }
  
  // "正在读取 xxx @ 0x290000..." -> "Reading xxx @ 0x290000..."
  const readingWithAddrMatch = trimmed.match(/^正在读取 (.+?) @ (0x[0-9a-fA-F]+)\.{3}$/);
  if (readingWithAddrMatch) {
    return text.replace(trimmed, `Reading ${readingWithAddrMatch[1]} @ ${readingWithAddrMatch[2]}...`);
  }
  
  // ==================== 文件操作提示反向翻译 ====================
  // "下载 filename.txt" -> "Download filename.txt"
  const downloadMatch = trimmed.match(/^下载\s+(.+)$/);
  if (downloadMatch) {
    return text.replace(trimmed, `Download ${downloadMatch[1]}`);
  }
  
  // "删除 filename.txt" -> "Delete filename.txt"
  const deleteMatch = trimmed.match(/^删除\s+(.+)$/);
  if (deleteMatch) {
    return text.replace(trimmed, `Delete ${deleteMatch[1]}`);
  }
  
  // "查看 filename.txt" -> "View filename.txt"
  const viewMatch = trimmed.match(/^查看\s+(.+)$/);
  if (viewMatch) {
    return text.replace(trimmed, `View ${viewMatch[1]}`);
  }
  
  // "播放 filename.mp3" -> "Listen to filename.mp3" 或 "Listen filename.mp3"
  const listenMatch = trimmed.match(/^播放\s+(.+)$/);
  if (listenMatch) {
    // 默认返回 "Listen filename" 格式（LittleFS使用）
    return text.replace(trimmed, `Listen ${listenMatch[1]}`);
  }

  return text;
}

/**
 * 检查元素是否应该被排除
 * 会检查元素本身及其所有祖先元素
 */
function shouldExclude(element) {
  if (!element) return false;
  
  // 如果没有 matches 方法（如文本节点），检查父元素
  if (!element.matches) {
    return element.parentElement ? shouldExclude(element.parentElement) : false;
  }
  
  try {
    // 检查元素本身是否匹配排除选择器
    for (const selector of excludeSelectors) {
      try {
        if (element.matches(selector)) {
          return true;
        }
        // 检查是否有匹配的祖先元素
        if (element.closest(selector)) {
          return true;
        }
      } catch {
        // 选择器无效，跳过
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * 处理单个文本节点
 */
function processTextNode(textNode, forceLang = null) {
  if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;
  
  const parent = textNode.parentElement;
  if (!parent) return;
  
  // 检查是否在排除区域内（包括检查所有祖先）
  if (shouldExclude(parent)) return;
  
  // 额外检查：如果在 pre 或 code 标签内，直接跳过
  if (parent.closest('pre') || parent.closest('code') || parent.closest('.monitor-terminal')) {
    return;
  }

  const lang = forceLang || getLanguage();
  const currentText = textNode.textContent;

  if (lang === 'zh') {
    // 翻译到中文：先尝试从英文翻译
    const translated = translateText(currentText);
    if (translated !== currentText) {
      textNode.textContent = translated;
    }
  } else {
    // 还原到英文：先尝试反向翻译
    const restored = reverseTranslateText(currentText);
    if (restored !== currentText) {
      textNode.textContent = restored;
    }
  }
}

/**
 * 处理元素的 placeholder、title、aria-label 等属性
 */
function processAttributes(element, forceLang = null) {
  if (!element || !element.getAttribute) return;
  if (shouldExclude(element)) return;

  const lang = forceLang || getLanguage();
  const translatableAttrs = ['placeholder', 'title', 'aria-label', 'alt'];

  translatableAttrs.forEach(attr => {
    const value = element.getAttribute(attr);
    if (!value) return;

    if (lang === 'zh') {
      const translated = translateText(value);
      if (translated !== value) {
        element.setAttribute(attr, translated);
      }
    } else {
      // 英文模式：尝试反向翻译
      const restored = reverseTranslateText(value);
      if (restored !== value) {
        element.setAttribute(attr, restored);
      }
    }
  });
}

/**
 * 递归处理 DOM 树
 */
function processElement(element, forceLang = null) {
  if (!element) return;
  if (shouldExclude(element)) return;

  // 处理属性
  processAttributes(element, forceLang);

  // 处理子节点
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent || shouldExclude(parent)) {
          return NodeFilter.FILTER_REJECT;
        }
        // 只处理有实际文本内容的节点
        if (!node.textContent.trim()) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const textNodes = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  textNodes.forEach(node => processTextNode(node, forceLang));

  // 处理子元素的属性
  element.querySelectorAll('*').forEach(child => {
    if (!shouldExclude(child)) {
      processAttributes(child, forceLang);
    }
  });
}

/**
 * 翻译整个页面
 */
function translatePage(forceLang = null) {
  const lang = forceLang || getLanguage();
  console.log(`[i18n] Translating page to: ${lang}`);
  processElement(document.body, lang);
}

/**
 * 切换语言
 */
function toggleLanguage() {
  const newLang = getLanguage() === 'zh' ? 'en' : 'zh';
  setLanguage(newLang);
  translatePage(newLang);
  
  // 更新切换按钮文本
  updateToggleButton();
  
  return newLang;
}

/**
 * 设置指定语言
 */
function switchLanguage(lang) {
  if (lang !== 'zh' && lang !== 'en') {
    console.warn(`[i18n] Unsupported language: ${lang}`);
    return;
  }
  setLanguage(lang);
  translatePage(lang);
  updateToggleButton();
  return lang;
}

/**
 * 创建语言切换按钮（插入到工具栏）
 */
function createToggleButton() {
  // 检查是否已存在
  if (document.getElementById('i18n-toggle-btn')) return;

  // 添加样式
  const style = document.createElement('style');
  style.id = 'i18n-toggle-style';
  style.textContent = `
    .i18n-toggle-btn {
      min-width: 36px !important;
      width: 36px !important;
      height: 36px !important;
      padding: 0 !important;
      border-radius: 50% !important;
      font-size: 13px !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
      border: none !important;
      background: transparent !important;
      color: inherit !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
    }
    
    .i18n-toggle-btn:hover {
      background: rgba(var(--v-theme-on-surface), 0.08) !important;
    }
    
    /* 调整工具栏按钮区域，避免紧贴左侧导航栏 */
    .v-app-bar .status-actions {
      margin-left: 16px !important;
    }
    .v-app-bar .v-chip.v-theme--dark.bg-grey-darken-1.v-chip--density-comfortable.v-chip--size-default.v-chip--variant-elevated.text-capitalize {
        margin-right: 16px !important;
      }
    .v-app-bar .v-chip.v-theme--dark.bg-success.v-chip--density-comfortable.v-chip--size-default.v-chip--variant-elevated.text-capitalize {
        margin-right: 16px !important;
      }
    .v-app-bar .v-chip.v-theme--light.bg-grey-darken-1.v-chip--density-comfortable.v-chip--size-default.v-chip--variant-elevated.text-capitalize {
        margin-right: 16px !important;
      }
    .v-app-bar .v-chip.v-theme--light.bg-success.v-chip--density-comfortable.v-chip--size-default.v-chip--variant-elevated.text-capitalize {
        margin-right: 16px !important;
      }
    .v-app-bar .v-btn.v-btn--icon.v-theme--dark.v-btn--density-default.v-btn--size-small.v-btn--variant-text {
        margin-right: 16px !important;
      }
    .v-app-bar .v-btn.v-btn--icon.v-theme--light.v-btn--density-default.v-btn--size-small.v-btn--variant-text {
        margin-right: 16px !important;
      }
    .v-app-bar .v-btn.v-btn--icon.v-theme--light.v-btn--density-default.v-btn--size-small.v-btn--variant-text.i18n-toggle-btn {
        margin-right: 16px !important;
      }
  `;
  document.head.appendChild(style);

  // 尝试将按钮插入到工具栏
  const tryInsertButton = () => {
    // 查找主题切换按钮（通过图标类名）
    const themeBtn = document.querySelector('.v-app-bar .v-btn .mdi-weather-night, .v-app-bar .v-btn .mdi-white-balance-sunny, .v-app-bar .v-btn .mdi-weather-sunny, .v-app-bar .v-btn .mdi-brightness-6');
    
    if (themeBtn) {
      const themeBtnContainer = themeBtn.closest('.v-btn');
      if (themeBtnContainer && !document.getElementById('i18n-toggle-btn')) {
        const btn = document.createElement('button');
        btn.id = 'i18n-toggle-btn';
        btn.className = 'v-btn v-btn--icon v-theme--light v-btn--density-default v-btn--size-small v-btn--variant-text i18n-toggle-btn';
        btn.setAttribute('data-no-translate', 'true');
        btn.setAttribute('type', 'button');
        btn.setAttribute('title', getLanguage() === 'zh' ? '切换到英文' : 'Switch to Chinese');
        
        updateToggleButtonText(btn);
        
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleLanguage();
        });

        // 插入到主题按钮之前
        themeBtnContainer.parentNode.insertBefore(btn, themeBtnContainer);
        console.log('[i18n] Language toggle button inserted into toolbar');
        return true;
      }
    }
    return false;
  };

  // 首次尝试
  if (!tryInsertButton()) {
    // 如果失败，使用 MutationObserver 等待工具栏加载
    const observer = new MutationObserver((mutations, obs) => {
      if (tryInsertButton()) {
        obs.disconnect();
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // 5秒后停止观察，防止无限等待
    setTimeout(() => {
      observer.disconnect();
      // 如果仍未找到，创建悬浮按钮作为后备方案
      if (!document.getElementById('i18n-toggle-btn')) {
        createFloatingButton();
      }
    }, 5000);
  }
}

/**
 * 创建悬浮按钮（后备方案）
 */
function createFloatingButton() {
  if (document.getElementById('i18n-toggle-btn')) return;

  const style = document.createElement('style');
  style.textContent = `
    .i18n-toggle-btn-floating {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
      padding: 10px 16px;
      border: none;
      border-radius: 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .i18n-toggle-btn-floating:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
    }
    
    .i18n-toggle-btn-floating::before {
      content: '🌐';
      font-size: 16px;
    }
  `;
  document.head.appendChild(style);

  const btn = document.createElement('button');
  btn.id = 'i18n-toggle-btn';
  btn.className = 'i18n-toggle-btn-floating';
  btn.setAttribute('data-no-translate', 'true');
  
  updateToggleButtonText(btn);
  
  btn.addEventListener('click', () => {
    toggleLanguage();
  });

  document.body.appendChild(btn);
}

function updateToggleButtonText(btn) {
  btn = btn || document.getElementById('i18n-toggle-btn');
  if (!btn) return;
  
  const lang = getLanguage();
  btn.textContent = lang === 'zh' ? 'EN' : '中';
    btn.setAttribute('title', lang === 'zh' ? 'Switch to English' : '切换为中文');
}

function updateToggleButton() {
  updateToggleButtonText();
}

/**
 * 设置 MutationObserver 监听 DOM 变化
 */
function setupObserver() {
  const observer = new MutationObserver((mutations) => {
    if (getLanguage() !== 'zh') return;

    mutations.forEach((mutation) => {
      // 处理新添加的节点
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          processTextNode(node);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          processElement(node);
        }
      });

      // 处理文本内容变化
      if (mutation.type === 'characterData') {
        processTextNode(mutation.target);
      }

      // 处理属性变化
      if (mutation.type === 'attributes' && mutation.target.nodeType === Node.ELEMENT_NODE) {
        processAttributes(mutation.target);
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['placeholder', 'title', 'aria-label', 'alt']
  });

  return observer;
}

/**
 * 初始化国际化系统
 */
function initI18n() {
  // 等待 DOM 就绪
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      init();
    });
  } else {
    init();
  }
}

function init() {
  console.log('[i18n] Initializing ESPConnect i18n system...');
  
  // 创建语言切换按钮
  createToggleButton();
  
  // 初始翻译（如果当前是中文模式）
  if (getLanguage() === 'zh') {
    // 延迟执行，等待 Vue 渲染完成
    setTimeout(() => {
      translatePage();
    }, 500);
    
    // 再次延迟，确保所有动态内容都已加载
    setTimeout(() => {
      translatePage();
    }, 2000);
  }
  
  // 设置 DOM 监听器
  setupObserver();
  
  console.log('[i18n] ESPConnect i18n system initialized');
}

// 导出 API
export { 
  initI18n, 
  translatePage, 
  toggleLanguage, 
  switchLanguage,
  getLanguage,
  setLanguage
};

// 暴露到全局，方便调试和控制台使用
if (typeof window !== 'undefined') {
  /** @type {any} */ (window).ESPConnectI18n = {
    toggleLanguage,
    switchLanguage,
    getLanguage,
    translatePage
  };
}
