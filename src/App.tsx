import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Copy,
  Download,
  ExternalLink,
  HelpCircle,
  Info,
  Link,
  RotateCcw,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Table2,
  X,
} from 'lucide-react'
import { Fragment, type FocusEvent, type KeyboardEvent, useEffect, useMemo, useState } from 'react'
import './App.css'

type Filament = {
  type: string
  color: string
  usedM: number
  usedG: number
}

type Plate = {
  index: number
  name: string
  weight: number
  predictionSeconds: number
  thumbnail: string
  filaments: Filament[]
}

type Profile = {
  instanceId: number
  profileId: number
  title: string
  creatorUid?: number | null
  creatorName?: string
  printer: string
  layerHeight: string
  infill: string
  wallLoops: string
  plateCount: number
  weight: number
  predictionSeconds: number
  downloadCount: number
  printCount: number
  ratingCount: number
  ratingScoreTotal: number
  score: number
  publishTime: string
  updateTime: string
  isDefault?: boolean
  isOfficial: boolean
  needAms: boolean
  materialColorCnt: number
  labelList?: string[]
  cover: string
  filaments: Filament[]
  plates?: Plate[]
}

type Project = {
  sourceUrl: string
  region: string
  designId: number
  modelId: string
  title: string
  slug: string
  creator: string
  creatorUid?: number | null
  coverUrl: string
  defaultInstanceId: number
  requestedProfileId: number | null
  selectedInstanceId: number
  instances: Profile[]
}

type ResolveError = {
  sourceUrl: string
  error: string
}

type ResolveResponse = {
  projects: Project[]
  errors: ResolveError[]
}

type SummaryRow = {
  key: string
  type: string
  color: string
  usedG: number
  usedM: number
  amsUsedG: number
  projects: Array<{
    designId: number
    title: string
    profileTitle: string
    sourceUrl: string
    grams: number
    amsAffected: boolean
  }>
}

type CatalogItem = {
  id: string
  brand: 'Bambu Lab'
  material: string
  line: string
  colorName: string
  family?: string
  hex: string
  sku?: string
  buyUrl: string
  defaultSpoolG: number
}

type PurchaseRow = {
  item: CatalogItem
  rawRows: SummaryRow[]
  usedG: number
  amsUsedG: number
  baseBufferG: number
  amsExtraBufferG: number
  requiredWithBuffer: number
  ownedGrams: number
  ownedRolls: number
  needToBuy: number
  spools: number
}

type InventoryEntry = {
  rolls: number
}

type MappingDecision = {
  item: CatalogItem
  source: 'auto' | 'manual'
  confidence: 'Exact' | 'Alias' | 'Family' | 'Fallback' | 'Manual'
  detail: string
}

type StepId = 'links' | 'profiles' | 'matrix' | 'purchase'
type ProfileSort = 'default' | 'downloads' | 'ratingCount' | 'printCount' | 'timeAsc' | 'weightAsc'
type Language = 'zh' | 'en'
type ActiveModal = 'help' | 'about' | null
type RawSelectionSource = 'matrix' | 'mapping'
type RawSelectionState = {
  keys: string[]
  source: RawSelectionSource | null
}
type PrinterCompatibility = {
  level: 'any' | 'exact' | 'compatible' | 'caution'
  label: string
  detail: string
  rank: number
}

type ProfileBadge = {
  key: string
  symbol: string
  label: string
  title: string
  tone: 'makerworld' | 'imported' | 'downloads' | 'reviews' | 'designer'
}

const anyPrinter = '__any__'
const legacyPrinterAliases: Record<string, string> = {
  x1: 'x1',
  x1c: 'x1',
  x1carbon: 'x1',
  x1e: 'x1',
  p1: 'p1',
  p1p: 'p1',
  p1s: 'p1',
  a1: 'a1',
  a1mini: 'a1mini',
}

const printerModelAliases: Record<string, string> = {
  x1: 'x1carbon',
  x1c: 'x1carbon',
  x1carbon: 'x1carbon',
  x1e: 'x1e',
  p1p: 'p1p',
  p1s: 'p1s',
  a1: 'a1',
  a1mini: 'a1mini',
  h2s: 'h2s',
  x2d: 'x2d',
  p2s: 'p2s',
}

const sampleLinks = [
  'https://makerworld.com/en/models/40146-benchy-bambu-pla-basic#profileId-109644',
  'https://makerworld.com/en/models/15106-benchy',
].join('\n')

const colorNames: Record<string, string> = {
  '#FFFFFF': 'White',
  '#161616': 'Black',
  '#000000': 'Black',
  '#F7D959': 'Yellow',
  '#F9A846': 'Orange',
  '#AE835B': 'Wood Brown',
  '#64281A': 'Dark Brown',
  '#0078BF': 'Blue',
  '#0086D6': 'Blue',
  '#057748': 'Green',
  '#00AE42': 'Green',
  '#F72323': 'Red',
  '#FB0207': 'Red',
}

const bambuPlaBasicColors = [
  {
    name: 'Jade White',
    family: 'White',
    hex: '#FFFFFF',
    sku: '10100',
    match: ['#FFFFFF'],
    buyUrl: 'https://us.store.bambulab.com/products/pla-basic-filament?id=41078274687112',
  },
  {
    name: 'Black',
    family: 'Black',
    hex: '#000000',
    sku: '10101',
    match: ['#000000', '#161616'],
    buyUrl: 'https://us.store.bambulab.com/products/pla-basic-filament?id=41078274654344',
  },
  {
    name: 'Red',
    family: 'Red',
    hex: '#C12E1F',
    sku: '10200',
    match: ['#F72323', '#FB0207', '#C12E1F', '#DE4343'],
    buyUrl: 'https://us.store.bambulab.com/products/pla-basic-filament?id=41078274621576',
  },
  {
    name: 'Yellow',
    family: 'Yellow',
    hex: '#F4EE2A',
    sku: '10400',
    match: ['#F7D959', '#FFF144', '#F4EE2A', '#EFE255'],
    buyUrl: 'https://us.store.bambulab.com/products/pla-basic-filament?id=40475106836616',
  },
  {
    name: 'Sunflower Yellow',
    family: 'Yellow',
    hex: '#FEC600',
    sku: '10402',
    match: ['#FEC600'],
    buyUrl: 'https://us.store.bambulab.com/products/pla-basic-filament?id=565815336288092161',
  },
  {
    name: 'Orange',
    family: 'Orange',
    hex: '#FF6A13',
    sku: '10300',
    match: ['#F9A846', '#FF8000', '#F4A925', '#FF6A13'],
    buyUrl: 'https://us.store.bambulab.com/products/pla-basic-filament?id=40475106672776',
  },
  {
    name: 'Mistletoe Green',
    family: 'Green',
    hex: '#3F8E43',
    sku: '10502',
    match: ['#057748', '#3F8E43'],
    buyUrl: 'https://us.store.bambulab.com/products/pla-basic-filament?id=43257238290568',
  },
  {
    name: 'Bambu Green',
    family: 'Green',
    hex: '#00AE42',
    sku: '10501',
    match: ['#00AE42', '#C2E189'],
    buyUrl: 'https://us.store.bambulab.com/products/pla-basic-filament?id=41135419228296',
  },
  {
    name: 'Cyan',
    family: 'Blue',
    hex: '#0086D6',
    sku: '10603',
    match: ['#0078BF', '#0086D6', '#368CF9', '#4DAFDA'],
    buyUrl: 'https://us.store.bambulab.com/products/pla-basic-filament?id=43257238749320',
  },
  {
    name: 'Blue',
    family: 'Blue',
    hex: '#00358E',
    sku: '10601',
    match: ['#00358E'],
    buyUrl: 'https://us.store.bambulab.com/products/pla-basic-filament?id=41142110093448',
  },
  {
    name: 'Purple',
    family: 'Purple',
    hex: '#5E43B7',
    sku: '10700',
    match: ['#735DF9', '#AE96D4', '#5E43B7'],
    buyUrl: 'https://us.store.bambulab.com/products/pla-basic-filament?id=41884191752328',
  },
  {
    name: 'Pink',
    family: 'Pink',
    hex: '#F55A74',
    sku: '10203',
    match: ['#E8AFCF', '#F55A74'],
    buyUrl: 'https://us.store.bambulab.com/products/pla-basic-filament?id=40475106902152',
  },
  {
    name: 'Beige',
    family: 'White',
    hex: '#F7E6DE',
    sku: '10201',
    match: ['#F7E6DE'],
    buyUrl: 'https://us.store.bambulab.com/products/pla-basic-filament?id=40475106771080',
  },
  {
    name: 'Cocoa Brown',
    family: 'Brown',
    hex: '#6F5034',
    sku: '10802',
    match: ['#64281A', '#AE835B', '#84620D', '#6F5034'],
    buyUrl: 'https://us.store.bambulab.com/products/pla-basic-filament?id=565815336288092185',
  },
  {
    name: 'Brown',
    family: 'Brown',
    hex: '#9D432C',
    sku: '10800',
    match: ['#9D432C'],
    buyUrl: 'https://us.store.bambulab.com/products/pla-basic-filament?id=40475106967688',
  },
  {
    name: 'Gold',
    family: 'Yellow',
    hex: '#E4BD68',
    sku: '10401',
    match: ['#E4BD68'],
    buyUrl: 'https://us.store.bambulab.com/products/pla-basic-filament?id=41884191195272',
  },
  {
    name: 'Silver',
    family: 'Gray',
    hex: '#A6A9AA',
    sku: '10102',
    match: ['#A6A9AA'],
    buyUrl: 'https://us.store.bambulab.com/products/pla-basic-filament?id=40475106803848',
  },
]

const bambuPetgHfColors = [
  {
    name: 'White',
    family: 'White',
    sku: '33100',
    hex: '#FFFFFF',
    buyUrl: 'https://us.store.bambulab.com/products/petg-hf?id=42735939813512',
  },
  {
    name: 'Black',
    family: 'Black',
    sku: '33102',
    hex: '#000000',
    buyUrl: 'https://us.store.bambulab.com/products/petg-hf?id=42735939682440',
  },
  {
    name: 'Red',
    family: 'Red',
    sku: '33200',
    hex: '#C12E1F',
    buyUrl: 'https://us.store.bambulab.com/products/petg-hf?id=42735939551368',
  },
  {
    name: 'Yellow',
    family: 'Yellow',
    sku: '33400',
    hex: '#F4EE2A',
    buyUrl: 'https://us.store.bambulab.com/products/petg-hf?id=654943233990885377',
  },
  {
    name: 'Orange',
    family: 'Orange',
    sku: '33300',
    hex: '#FF6A13',
    buyUrl: 'https://us.store.bambulab.com/products/petg-hf?id=654207405072093197',
  },
  {
    name: 'Green',
    family: 'Green',
    sku: '33500',
    hex: '#00AE42',
    buyUrl: 'https://us.store.bambulab.com/products/petg-hf?id=654207405072093203',
  },
  {
    name: 'Blue',
    family: 'Blue',
    sku: '33600',
    hex: '#0086D6',
    buyUrl: 'https://us.store.bambulab.com/products/petg-hf?id=42735939420296',
  },
  {
    name: 'Peanut Brown',
    family: 'Brown',
    sku: '33801',
    hex: '#6F5034',
    buyUrl: 'https://us.store.bambulab.com/products/petg-hf?id=659540022699311104',
  },
]

const bambuAbsColors = [
  {
    name: 'White',
    family: 'White',
    sku: '40100',
    hex: '#FFFFFF',
    buyUrl: 'https://us.store.bambulab.com/products/abs-filament?id=41216786694280',
  },
  {
    name: 'Black',
    family: 'Black',
    sku: '40101',
    hex: '#000000',
    buyUrl: 'https://us.store.bambulab.com/products/abs-filament?id=41216786432136',
  },
  {
    name: 'Orange',
    family: 'Orange',
    sku: '40300',
    hex: '#FF6A13',
    buyUrl: 'https://us.store.bambulab.com/products/abs-filament?id=42512931750024',
  },
  {
    name: 'Brown',
    family: 'Brown',
    sku: undefined,
    hex: '#6F5034',
    buyUrl: 'https://us.store.bambulab.com/products/abs-filament',
  },
]

const colorFamilies = [
  { name: 'White', hex: '#FFFFFF', match: ['#FFFFFF', '#F7E6DE'] },
  { name: 'Black', hex: '#000000', match: ['#161616', '#000000'] },
  { name: 'Red', hex: '#C12E1F', match: ['#F72323', '#FB0207', '#C12E1F', '#DE4343'] },
  { name: 'Yellow', hex: '#F4EE2A', match: ['#F7D959', '#FFF144', '#F4EE2A', '#EFE255', '#FEC600'] },
  { name: 'Orange', hex: '#FF6A13', match: ['#F9A846', '#FF8000', '#F4A925', '#FF6A13'] },
  { name: 'Green', hex: '#00AE42', match: ['#057748', '#00AE42', '#C2E189', '#3F8E43'] },
  { name: 'Blue', hex: '#0086D6', match: ['#0078BF', '#0086D6', '#368CF9', '#4DAFDA', '#00358E'] },
  { name: 'Purple', hex: '#5E43B7', match: ['#735DF9', '#AE96D4', '#5E43B7'] },
  { name: 'Pink', hex: '#F55A74', match: ['#E8AFCF', '#F55A74'] },
  { name: 'Brown', hex: '#6F5034', match: ['#64281A', '#AE835B', '#84620D', '#9D432C'] },
]

const bambuCatalog: CatalogItem[] = [
  ...bambuPlaBasicColors.map((color) => ({
    id: `bambu:PLA:PLA Basic:${color.name}`,
    brand: 'Bambu Lab' as const,
    material: 'PLA',
	    line: 'PLA Basic',
	    colorName: color.name,
	    family: color.family,
	    hex: color.hex,
	    sku: color.sku,
	    buyUrl: color.buyUrl,
	    defaultSpoolG: 1000,
	  })),
	  ...bambuPetgHfColors.map((color) => ({
	    id: `bambu:PETG:PETG HF:${color.name}`,
	      brand: 'Bambu Lab' as const,
	      material: 'PETG',
		      line: 'PETG HF',
		      colorName: color.name,
		      family: color.family,
		      hex: color.hex,
	      sku: color.sku,
	      buyUrl: color.buyUrl,
	      defaultSpoolG: 1000,
	  })),
	  ...bambuAbsColors.map((color) => ({
	    id: `bambu:ABS:ABS:${color.name}`,
	    brand: 'Bambu Lab' as const,
	    material: 'ABS',
	    line: 'ABS',
	    colorName: color.name,
	    family: color.family,
	    hex: color.hex,
	    sku: color.sku,
	    buyUrl: color.buyUrl,
	    defaultSpoolG: 1000,
	  })),
]

function formatMinutes(seconds: number) {
  if (!seconds) return '-'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)
  if (hours === 0) return `${minutes}m`
  return `${hours}h ${minutes}m`
}

function formatCount(count: number) {
  if (!count) return '0'
  if (count >= 10000) return `${(count / 10000).toFixed(1)}w`
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`
  return String(count)
}

function formatRating(profile: Profile, isEnglish = false) {
  if (!profile.ratingCount) return isEnglish ? 'No ratings yet' : '暂无评分'
  const score = profile.ratingScoreTotal ? profile.ratingScoreTotal / profile.ratingCount : profile.score * 5
  return `${score.toFixed(1)}/5 (${profile.ratingCount})`
}

function formatRolls(count: number, isEnglish = false) {
  if (!isEnglish) return `${count} 卷`
  return `${count} ${count === 1 ? 'roll' : 'rolls'}`
}

function getVariantIdFromBuyUrl(buyUrl: string) {
  try {
    return new URL(buyUrl).searchParams.get('id') || ''
  } catch {
    return ''
  }
}

function buildCartUrl(item: CatalogItem, quantity: number) {
  const variantId = getVariantIdFromBuyUrl(item.buyUrl)
  if (!variantId || quantity <= 0) return item.buyUrl
  const url = new URL(item.buyUrl)
  url.pathname = `/cart/${variantId}:${quantity}`
  url.search = ''
  url.hash = ''
  return url.toString()
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

function normalizePrinterName(printer: string) {
  return printer.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function collectAliasValues(printer: string, aliases: Record<string, string>) {
  let remaining = normalizePrinterName(printer)
  const values = new Set<string>()
  Object.entries(aliases)
    .sort(([left], [right]) => right.length - left.length)
    .forEach(([alias, value]) => {
      if (remaining.includes(alias)) {
        values.add(value)
        remaining = remaining.split(alias).join(' ')
      }
    })
  return Array.from(values)
}

function getPrinterModelKey(printer: string) {
  const normalized = normalizePrinterName(printer)
  return printerModelAliases[normalized] || normalized
}

function getPrinterModelKeys(printer: string) {
  return collectAliasValues(printer, printerModelAliases)
}

function getLegacyPrinterFamilies(printer: string) {
  return collectAliasValues(printer, legacyPrinterAliases)
}

function isLegacyPrinter(printer: string) {
  return getLegacyPrinterFamilies(printer).length > 0
}

function isNewPlatformPrinter(printer: string) {
  const normalized = normalizePrinterName(printer)
  return normalized.includes('h2') || normalized.includes('x2') || normalized.includes('p2')
}

function getPrinterCompatibility(profile: Profile, targetPrinter: string, isEnglish = false): PrinterCompatibility {
  if (targetPrinter === anyPrinter) {
    return {
      level: 'any',
      label: isEnglish ? 'Any printer' : '任意打印机',
      detail: isEnglish ? 'No target printer selected.' : '未选择目标打印机。',
      rank: 3,
    }
  }
  if (!profile.printer) {
    return {
      level: 'caution',
      label: isEnglish ? 'Check printer' : '需核对打印机',
      detail: isEnglish ? 'This profile does not include a printer model.' : '该配置未包含打印机型号。',
      rank: 0,
    }
  }

  const profileModels = getPrinterModelKeys(profile.printer)
  const targetModels = getPrinterModelKeys(targetPrinter)
  const hasExactModel =
    profileModels.length > 0 && targetModels.some((targetModel) => profileModels.includes(targetModel))
  const hasExactUnknownModel =
    profileModels.length === 0 &&
    targetModels.length === 0 &&
    getPrinterModelKey(profile.printer) === getPrinterModelKey(targetPrinter)

  if (hasExactModel || hasExactUnknownModel) {
    return {
      level: 'exact',
      label: isEnglish ? 'Exact printer match' : '打印机精确匹配',
      detail: isEnglish ? `This profile is marked for ${profile.printer}.` : `该配置标记为 ${profile.printer}。`,
      rank: 3,
    }
  }

  const profileFamilies = getLegacyPrinterFamilies(profile.printer)
  const targetFamilies = getLegacyPrinterFamilies(targetPrinter)
  const profileHasA1Mini = profileFamilies.includes('a1mini')
  const targetHasA1Mini = targetFamilies.includes('a1mini')
  if (profileFamilies.length > 0 && targetFamilies.length > 0) {
    if (profileHasA1Mini && !targetHasA1Mini && profileFamilies.length === 1) {
      return {
        level: 'compatible',
        label: isEnglish ? 'Likely compatible' : '大概率兼容',
        detail: isEnglish
          ? 'A1 mini profiles are usually conservative for larger X/P/A series printers.'
          : 'A1 mini 配置通常对更大的 X/P/A 系列打印机较保守。',
        rank: 2,
      }
    }
    if (targetHasA1Mini && !profileHasA1Mini) {
      return {
        level: 'caution',
        label: isEnglish ? 'Check size' : '需核对尺寸',
        detail: isEnglish
          ? 'A1 mini has the smallest build volume, so profiles for larger printers need a size check.'
          : 'A1 mini 成型尺寸最小，较大机型的配置需要核对模型尺寸。',
        rank: 0,
      }
    }
    return {
      level: 'compatible',
      label: isEnglish ? 'Likely compatible' : '大概率兼容',
      detail: isEnglish
        ? 'X/P/A series Bambu profiles are often portable, but should still be checked in the slicer.'
        : 'X/P/A 系列 Bambu 配置通常可迁移，但仍需在切片软件中确认。',
      rank: 2,
    }
  }

  if (isNewPlatformPrinter(profile.printer) || isNewPlatformPrinter(targetPrinter)) {
    return {
      level: 'caution',
      label: isEnglish ? 'Check printer' : '需核对打印机',
      detail: isEnglish
        ? 'Newer H/X2 platforms may assume different hardware, beds, or toolheads.'
        : '较新的 H/X2 平台可能有不同硬件、热床或工具头假设。',
      rank: 0,
    }
  }

  if (isLegacyPrinter(profile.printer) || isLegacyPrinter(targetPrinter)) {
    return {
      level: 'compatible',
      label: isEnglish ? 'Likely compatible' : '大概率兼容',
      detail: isEnglish
        ? 'This looks close to a common Bambu printer series; confirm it in the slicer before printing.'
        : '看起来接近常规 Bambu 打印机系列，打印前请在切片软件中确认。',
      rank: 1,
    }
  }

  return {
    level: 'caution',
    label: isEnglish ? 'Check printer' : '需核对打印机',
    detail: isEnglish ? 'Unknown printer series.' : '未知打印机系列。',
    rank: 0,
  }
}

function profileMatchesPrinter(profile: Profile, targetPrinter: string) {
  return getPrinterCompatibility(profile, targetPrinter).rank > 0
}

function compareByProfileSort(a: Profile, b: Profile, sortBy: ProfileSort) {
  if (sortBy === 'downloads') return b.downloadCount - a.downloadCount
  if (sortBy === 'ratingCount') return b.ratingCount - a.ratingCount
  if (sortBy === 'printCount') return b.printCount - a.printCount
  if (sortBy === 'timeAsc') {
    return (a.predictionSeconds || Number.MAX_SAFE_INTEGER) - (b.predictionSeconds || Number.MAX_SAFE_INTEGER)
  }
  if (sortBy === 'weightAsc') {
    return (a.weight || Number.MAX_SAFE_INTEGER) - (b.weight || Number.MAX_SAFE_INTEGER)
  }
  return 0
}

function sortProfiles(instances: Profile[], sortBy: ProfileSort, targetPrinter: string) {
  const sorted = [...instances]
  return sorted.sort((a, b) => {
    const matchDelta = getPrinterCompatibility(b, targetPrinter).rank - getPrinterCompatibility(a, targetPrinter).rank
    return matchDelta || compareByProfileSort(a, b, sortBy)
  })
}

function profileHasMakerWorldDesignerLabel(project: Project, profile: Profile) {
  const makerWorldLabels = (profile.labelList || []).map((label) => label.toLowerCase())
  return (
    makerWorldLabels.includes('designer') ||
    makerWorldLabels.includes('design_creator') ||
    makerWorldLabels.includes('model_designer') ||
    (Boolean(project.creatorUid) && project.creatorUid === profile.creatorUid)
  )
}

function profileMatchesRequestedId(project: Project, profile: Profile) {
  return (
    Boolean(project.requestedProfileId) &&
    (project.requestedProfileId === profile.profileId || project.requestedProfileId === profile.instanceId)
  )
}

function getProfileBadges(project: Project, profile: Profile, isEnglish = false): ProfileBadge[] {
  const maxDownloads = Math.max(...project.instances.map((instance) => instance.downloadCount || 0))
  const maxRatings = Math.max(...project.instances.map((instance) => instance.ratingCount || 0))
  const isMakerWorldDefault = profile.isDefault || profile.instanceId === project.defaultInstanceId
  const isRequestedProfile = profileMatchesRequestedId(project, profile)
  const badges: ProfileBadge[] = []

  if (isMakerWorldDefault) {
    badges.push({
      key: 'makerworld-default',
      symbol: '★',
      label: isEnglish ? 'MakerWorld default' : 'MakerWorld 默认',
      title: isEnglish ? 'MakerWorld default recommended profile' : 'MakerWorld 默认推荐配置',
      tone: 'makerworld',
    })
  }

  if (isRequestedProfile) {
    badges.push({
      key: 'imported',
      symbol: '◆',
      label: isEnglish ? 'Imported profile' : '导入指定',
      title: isEnglish ? 'This profile was specified in the imported link' : '导入链接中指定的 profile',
      tone: 'imported',
    })
  }

  if (maxDownloads > 0 && profile.downloadCount === maxDownloads) {
    badges.push({
      key: 'top-downloads',
      symbol: '↓',
      label: isEnglish ? 'Most downloads' : '下载最高',
      title: isEnglish ? 'Highest download count among this model profiles' : '该模型所有配置中下载量最高',
      tone: 'downloads',
    })
  }

  if (maxRatings > 0 && profile.ratingCount === maxRatings) {
    badges.push({
      key: 'top-ratings',
      symbol: '●',
      label: isEnglish ? 'Most reviews' : '评论最高',
      title: isEnglish ? 'Highest review or rating count among this model profiles' : '该模型所有配置中评论/评分数量最高',
      tone: 'reviews',
    })
  }

  if (profileHasMakerWorldDesignerLabel(project, profile)) {
    badges.push({
      key: 'designer',
      symbol: 'D',
      label: isEnglish ? 'Designer' : '设计师',
      title: isEnglish
        ? profile.creatorName
          ? `Profile by model designer ${profile.creatorName}`
          : 'Profile by the model designer'
        : profile.creatorName
          ? `模型设计师发布的配置：${profile.creatorName}`
          : '模型设计师发布的配置',
      tone: 'designer',
    })
  }

  return badges
}

function getProfileBadgeLegend(isEnglish = false): ProfileBadge[] {
  return [
    {
      key: 'makerworld-default',
      symbol: '★',
      label: isEnglish ? 'MakerWorld default' : 'MakerWorld 默认',
      title: isEnglish ? 'MakerWorld default recommended profile' : 'MakerWorld 默认推荐配置',
      tone: 'makerworld',
    },
    {
      key: 'imported',
      symbol: '◆',
      label: isEnglish ? 'Imported link pick' : '导入指定',
      title: isEnglish ? 'This profile was specified in the imported link' : '导入链接中指定的 profile',
      tone: 'imported',
    },
    {
      key: 'top-downloads',
      symbol: '↓',
      label: isEnglish ? 'Most downloads' : '下载最高',
      title: isEnglish ? 'Highest download count among this model profiles' : '该模型所有配置中下载量最高',
      tone: 'downloads',
    },
    {
      key: 'top-ratings',
      symbol: '●',
      label: isEnglish ? 'Most reviews' : '评论最高',
      title: isEnglish ? 'Highest review or rating count among this model profiles' : '该模型所有配置中评论/评分数量最高',
      tone: 'reviews',
    },
    {
      key: 'designer',
      symbol: 'D',
      label: isEnglish ? 'Designer profile' : '设计师配置',
      title: isEnglish ? 'Profile by the model designer' : '模型设计师发布的配置',
      tone: 'designer',
    },
  ]
}

function profileDetailsLabel(profile: Profile, isEnglish = false) {
  const printer = profile.printer || (isEnglish ? 'Any printer' : '任意打印机')
  const plates = isEnglish
    ? `${profile.plateCount} ${profile.plateCount === 1 ? 'plate' : 'plates'}`
    : `${profile.plateCount} 盘`
  const downloads = isEnglish ? `${formatCount(profile.downloadCount)} downloads` : `${formatCount(profile.downloadCount)} 下载`
  return `${printer} · ${formatMinutes(profile.predictionSeconds)} · ${plates} · ${profile.weight}g · ${formatRating(profile, isEnglish)} · ${downloads}`
}

function filamentKey(filament: Pick<Filament, 'type' | 'color'>) {
  return `${filament.type}|${filament.color}`
}

function inferColorFamily(hex: string) {
  const normalized = hex.toUpperCase()
  return (
    colorFamilies.find((family) => family.match.includes(normalized)) ||
    colorFamilies.find((family) => family.name === colorNames[normalized]) ||
    { name: normalized, hex: normalized, match: [normalized] }
  )
}

function getPlaAliasMatch(colorName: string, hex: string) {
  return bambuPlaBasicColors.find((color) => color.name === colorName && color.match.includes(hex))
}

function inferBambuCatalogDecision(row: SummaryRow, isEnglish = false): MappingDecision | null {
  const normalized = row.color.toUpperCase()
  const material = row.type.toUpperCase()
  const exactMatch = bambuCatalog.find((item) => item.material === material && item.hex.toUpperCase() === normalized)
  if (exactMatch) {
    return {
      item: exactMatch,
      source: 'auto',
      confidence: 'Exact',
      detail: isEnglish
        ? `MakerWorld ${normalized} exactly matches the catalog HEX value.`
        : `MakerWorld ${normalized} 与耗材目录 HEX 完全一致。`,
    }
  }

  const aliasMatch = bambuCatalog.find(
    (item) => item.material === material && Boolean(getPlaAliasMatch(item.colorName, normalized)),
  )
  if (aliasMatch) {
    return {
      item: aliasMatch,
      source: 'auto',
      confidence: 'Alias',
      detail: isEnglish
        ? `MakerWorld ${normalized} maps to ${aliasMatch.colorName} in the alias table.`
        : `MakerWorld ${normalized} 在别名表中对应 ${aliasMatch.colorName}。`,
    }
  }

  const family = inferColorFamily(normalized)
  const familyMatch = bambuCatalog.find(
    (item) => item.material === material && (item.family || item.colorName) === family.name,
  )
  if (familyMatch) {
    return {
      item: familyMatch,
      source: 'auto',
      confidence: 'Family',
      detail: isEnglish
        ? `MakerWorld ${normalized} is inferred as the ${family.name} color family.`
        : `根据 MakerWorld ${normalized} 推测为 ${family.name} 同色系。`,
    }
  }

  return null
}

function fallbackCatalogItem(row: SummaryRow): CatalogItem {
  const family = inferColorFamily(row.color)
  const material = row.type.toUpperCase()
  return {
    id: `bambu:${material}:${family.name}`,
    brand: 'Bambu Lab',
    material,
    line: material,
    colorName: family.name,
    hex: family.hex,
    buyUrl: 'https://store.bambulab.com/collections/bambu-lab-3d-printer-filament',
    defaultSpoolG: 1000,
  }
}

function getCatalogItem(itemId: string, row: SummaryRow) {
  return bambuCatalog.find((item) => item.id === itemId) || fallbackCatalogItem(row)
}

function getMappingDecision(row: SummaryRow, mappedItemId?: string, isEnglish = false): MappingDecision {
  if (mappedItemId) {
    return {
      item: getCatalogItem(mappedItemId, row),
      source: 'manual',
      confidence: 'Manual',
      detail: isEnglish
        ? 'The purchase color was manually selected in this tool.'
        : '已在本工具中手动指定购买颜色。',
    }
  }

  const autoDecision = inferBambuCatalogDecision(row, isEnglish)
  if (autoDecision) return autoDecision

  const fallback = fallbackCatalogItem(row)
  return {
    item: fallback,
    source: 'auto',
    confidence: 'Fallback',
    detail: isEnglish
      ? `No catalog color matched; temporarily grouped under ${fallback.colorName}. Confirm before purchase.`
      : `未匹配到目录颜色，暂时归入 ${fallback.colorName}，下单前必须确认。`,
  }
}

function compareSummaryRowsForMapping(
  left: SummaryRow,
  right: SummaryRow,
  mappings: Record<string, string>,
) {
  const leftDecision = getMappingDecision(left, mappings[left.key])
  const rightDecision = getMappingDecision(right, mappings[right.key])
  const leftItem = leftDecision.item
  const rightItem = rightDecision.item
  const leftFamily = leftItem.family || inferColorFamily(leftItem.hex).name || leftItem.colorName
  const rightFamily = rightItem.family || inferColorFamily(rightItem.hex).name || rightItem.colorName

  return (
    leftItem.material.localeCompare(rightItem.material) ||
    leftItem.line.localeCompare(rightItem.line) ||
    leftFamily.localeCompare(rightFamily) ||
    leftItem.colorName.localeCompare(rightItem.colorName) ||
    left.color.localeCompare(right.color) ||
    right.usedG - left.usedG
  )
}

function getSelectedProfile(project: Project) {
  return (
    project.instances.find((profile) => profile.instanceId === project.selectedInstanceId) ||
    project.instances[0]
  )
}

function isAmsAffectedProfile(profile: Profile) {
  return profile.needAms || profile.materialColorCnt > 1
}

function getAmsAffectedUsageByFilament(profile: Profile) {
  const rows = new Map<string, number>()
  const platesWithFilaments = (profile.plates || []).filter((plate) => plate.filaments.length > 0)

  if (platesWithFilaments.length === 0) {
    if (!isAmsAffectedProfile(profile)) return rows
    for (const filament of profile.filaments) {
      rows.set(filamentKey(filament), (rows.get(filamentKey(filament)) || 0) + Number(filament.usedG || 0))
    }
    return rows
  }

  for (const plate of platesWithFilaments) {
    const usedFilaments = plate.filaments.filter((filament) => Number(filament.usedG || filament.usedM || 0) > 0)
    const distinctFilamentKeys = new Set(usedFilaments.map(filamentKey))
    if (distinctFilamentKeys.size <= 1) continue

    for (const filament of usedFilaments) {
      const key = filamentKey(filament)
      rows.set(key, (rows.get(key) || 0) + Number(filament.usedG || 0))
    }
  }

  return rows
}

function hasAmsAffectedUsage(profile: Profile) {
  for (const grams of getAmsAffectedUsageByFilament(profile).values()) {
    if (grams > 0) return true
  }
  return false
}

function calculateBufferBreakdown(usedG: number, amsUsedG: number, baseBufferPct: number, amsExtraBufferPct: number) {
  const baseBufferG = Math.ceil((usedG * baseBufferPct) / 100)
  const amsExtraBufferG = Math.ceil((amsUsedG * amsExtraBufferPct) / 100)
  return {
    baseBufferG,
    amsExtraBufferG,
    requiredWithBuffer: usedG + baseBufferG + amsExtraBufferG,
  }
}

function getMappingConfidenceLabel(confidence: MappingDecision['confidence'], isEnglish = false) {
  if (confidence === 'Exact') return isEnglish ? 'Exact match' : '精确匹配'
  if (confidence === 'Alias') return isEnglish ? 'Alias match' : '别名匹配'
  if (confidence === 'Family') return isEnglish ? 'Family estimate' : '同色系推测'
  if (confidence === 'Manual') return isEnglish ? 'Manual' : '已手动指定'
  return isEnglish ? 'Unmatched, confirm manually' : '未匹配，需手动确认'
}

function getMappingRiskClass(confidence: MappingDecision['confidence']) {
  if (confidence === 'Fallback') return 'risk-danger'
  if (confidence === 'Family') return 'risk-warning'
  return 'risk-ok'
}

const ruleDefaultsVersion = '2026-06-15-buffer-v2'

function readRuleDefault(key: string, nextDefault: number, previousDefault: number) {
  const saved = localStorage.getItem(key)
  const migrated = localStorage.getItem('filamentPlanner.ruleDefaultsVersion') === ruleDefaultsVersion
  if (!migrated && (saved === null || Number(saved) === previousDefault)) return nextDefault
  return saved === null ? nextDefault : Number(saved)
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

function normalizeNumberInput(value: string, fallback: number, min: number, max: number) {
  const trimmed = value.trim()
  if (trimmed === '') return fallback
  return clampNumber(Number(trimmed), min, max)
}

function normalizeNumberDraft(value: string) {
  return value.replace(/^0+(?=\d)/, '')
}

function getProfileSelectionReason(
  project: Project,
  profile: Profile,
  manuallySelected: boolean,
  isEnglish = false,
) {
  if (manuallySelected) return isEnglish ? 'You manually selected this profile' : '你已手动选择该配置'
  if (
    project.requestedProfileId &&
    (project.requestedProfileId === profile.profileId || project.requestedProfileId === profile.instanceId)
  ) {
    return isEnglish ? 'The link specified profileId, so this profile was selected' : '链接指定了 profileId，因此已选中该配置'
  }
  if (project.selectedInstanceId === project.defaultInstanceId) {
    return isEnglish ? 'Using the MakerWorld default print profile' : '使用 MakerWorld 默认打印配置'
  }
  return isEnglish
    ? 'The requested or default profile was not found; using the first parsed profile. Please review it.'
    : '未找到指定或默认配置，已使用可解析的第一个配置，请核对'
}

function App() {
  const [links, setLinks] = useState(() => localStorage.getItem('filamentPlanner.links') || sampleLinks)
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('filamentPlanner.projects') || '[]') as Project[]
    } catch {
      return []
    }
  })
  const [includedProjectIds, setIncludedProjectIds] = useState<number[] | null>(() => {
    try {
      const saved = localStorage.getItem('filamentPlanner.includedProjectIds')
      return saved ? (JSON.parse(saved) as number[]) : null
    } catch {
      return null
    }
  })
  const [errors, setErrors] = useState<ResolveError[]>([])
  const [isResolving, setIsResolving] = useState(false)
  const [bufferPct, setBufferPct] = useState(() => readRuleDefault('filamentPlanner.bufferPct', 5, 10))
  const [amsBufferPct, setAmsBufferPct] = useState(() => readRuleDefault('filamentPlanner.amsBufferPct', 10, 0))
  const [spoolSize, setSpoolSize] = useState(() => Number(localStorage.getItem('filamentPlanner.spoolSize') || 1000))
  const [bufferPctInput, setBufferPctInput] = useState(() => String(bufferPct))
  const [amsBufferPctInput, setAmsBufferPctInput] = useState(() => String(amsBufferPct))
  const [spoolSizeInput, setSpoolSizeInput] = useState(() => String(spoolSize))
  const [inventory, setInventory] = useState<Record<string, InventoryEntry>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('filamentPlanner.inventory') || '{}') as Record<
        string,
        number | InventoryEntry
      >
      return Object.fromEntries(
        Object.entries(saved).map(([key, value]) => [
          key,
          typeof value === 'number' ? { rolls: value / 1000 } : { rolls: Number(value.rolls || 0) },
        ]),
      )
    } catch {
      return {}
    }
  })
  const [purchaseMappings, setPurchaseMappings] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem('filamentPlanner.mappings') || '{}') as Record<string, string>
    } catch {
      return {}
    }
  })
  const [manualProfileSelections, setManualProfileSelections] = useState<Record<number, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('filamentPlanner.manualProfileSelections') || '{}') as Record<
        number,
        boolean
      >
    } catch {
      return {}
    }
	  })
	  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')
  const [rawSelection, setRawSelection] = useState<RawSelectionState>({ keys: [], source: null })
  const selectedRawKeys = rawSelection.keys
  const rawSelectionSource = rawSelection.source
	  const [batchMappingItemId, setBatchMappingItemId] = useState(bambuCatalog[0]?.id || '')
  const [isBatchColorMenuOpen, setIsBatchColorMenuOpen] = useState(false)
  const [expandedPurchaseRowIds, setExpandedPurchaseRowIds] = useState<string[]>([])
	  const [activeStep, setActiveStep] = useState<StepId>(() => {
	    const saved = localStorage.getItem('filamentPlanner.activeStep') as StepId | null
	    return saved || (projects.length > 0 ? 'profiles' : 'links')
	  })
	  const [focusedColorKey, setFocusedColorKey] = useState<string | null>(null)
	  const [profileSort, setProfileSort] = useState<ProfileSort>(() => {
	    const saved = localStorage.getItem('filamentPlanner.profileSort') as ProfileSort | null
	    return saved || 'default'
	  })
  const [openProfilePickerId, setOpenProfilePickerId] = useState<number | null>(null)
  const [targetPrinter, setTargetPrinter] = useState(() => localStorage.getItem('filamentPlanner.targetPrinter') || anyPrinter)
  const [activeModal, setActiveModal] = useState<ActiveModal>(() =>
    localStorage.getItem('filamentPlanner.helpSeen') === 'true' ? null : 'help',
  )
  const [language, setLanguage] = useState<Language>(() =>
    localStorage.getItem('filamentPlanner.language') === 'en' ? 'en' : 'zh',
  )
  const isEnglish = language === 'en'

  function clearRawSelection() {
    setRawSelection({ keys: [], source: null })
  }

  useEffect(() => {
    localStorage.setItem('filamentPlanner.links', links)
  }, [links])

  useEffect(() => {
    localStorage.setItem('filamentPlanner.projects', JSON.stringify(projects))
  }, [projects])

  useEffect(() => {
    if (includedProjectIds === null) {
      localStorage.removeItem('filamentPlanner.includedProjectIds')
    } else {
      localStorage.setItem('filamentPlanner.includedProjectIds', JSON.stringify(includedProjectIds))
    }
  }, [includedProjectIds])

  useEffect(() => {
    localStorage.setItem('filamentPlanner.bufferPct', String(bufferPct))
    localStorage.setItem('filamentPlanner.ruleDefaultsVersion', ruleDefaultsVersion)
  }, [bufferPct])

  useEffect(() => {
    setBufferPctInput(String(bufferPct))
  }, [bufferPct])

  useEffect(() => {
    localStorage.setItem('filamentPlanner.amsBufferPct', String(amsBufferPct))
    localStorage.setItem('filamentPlanner.ruleDefaultsVersion', ruleDefaultsVersion)
  }, [amsBufferPct])

  useEffect(() => {
    setAmsBufferPctInput(String(amsBufferPct))
  }, [amsBufferPct])

  useEffect(() => {
    localStorage.setItem('filamentPlanner.spoolSize', String(spoolSize))
  }, [spoolSize])

  useEffect(() => {
    setSpoolSizeInput(String(spoolSize))
  }, [spoolSize])

  useEffect(() => {
    localStorage.setItem('filamentPlanner.inventory', JSON.stringify(inventory))
  }, [inventory])

	  useEffect(() => {
	    localStorage.setItem('filamentPlanner.mappings', JSON.stringify(purchaseMappings))
	  }, [purchaseMappings])

  useEffect(() => {
    localStorage.setItem('filamentPlanner.manualProfileSelections', JSON.stringify(manualProfileSelections))
  }, [manualProfileSelections])

	  useEffect(() => {
	    localStorage.setItem('filamentPlanner.activeStep', activeStep)
	  }, [activeStep])

	  useEffect(() => {
	    localStorage.setItem('filamentPlanner.profileSort', profileSort)
	  }, [profileSort])

  useEffect(() => {
    localStorage.setItem('filamentPlanner.targetPrinter', targetPrinter)
  }, [targetPrinter])

  useEffect(() => {
    localStorage.setItem('filamentPlanner.language', language)
  }, [language])

  useEffect(() => {
    function handleEscapeSelection(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        clearRawSelection()
        setFocusedColorKey(null)
      }
    }

    window.addEventListener('keydown', handleEscapeSelection)
    return () => window.removeEventListener('keydown', handleEscapeSelection)
  }, [])

  const allProjectIds = useMemo(() => projects.map((project) => project.designId), [projects])
  const printerOptions = useMemo(
    () =>
      Array.from(
        new Set(
          projects
            .flatMap((project) => project.instances.map((profile) => profile.printer).filter(Boolean))
            .sort((a, b) => a.localeCompare(b)),
        ),
      ),
    [projects],
  )
  const allProjectIdSet = useMemo(() => new Set(allProjectIds), [allProjectIds])
  const plannedProjectIds = useMemo(
    () => (includedProjectIds ?? allProjectIds).filter((projectId) => allProjectIdSet.has(projectId)),
    [allProjectIdSet, allProjectIds, includedProjectIds],
  )
  const plannedProjectIdSet = useMemo(() => new Set(plannedProjectIds), [plannedProjectIds])
  const plannedProjects = useMemo(
    () => projects.filter((project) => plannedProjectIdSet.has(project.designId)),
    [plannedProjectIdSet, projects],
  )
  const hasResolvableLinks = links
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean).length > 0

  const summary = useMemo(() => {
    const rows = new Map<string, SummaryRow>()

    for (const project of plannedProjects) {
      const profile = getSelectedProfile(project)
      const amsAffectedUsageByFilament = getAmsAffectedUsageByFilament(profile)
      for (const filament of profile.filaments) {
        const key = filamentKey(filament)
        const grams = Number(filament.usedG || 0)
        const amsGrams = amsAffectedUsageByFilament.get(key) || 0
        const row = rows.get(key) || {
          key,
          type: filament.type,
          color: filament.color,
          usedG: 0,
          usedM: 0,
          amsUsedG: 0,
          projects: [],
        }
        row.usedG += grams
        row.usedM += Number(filament.usedM || 0)
        row.amsUsedG += amsGrams
        row.projects.push({
          designId: project.designId,
          title: project.title,
          profileTitle: profile.title,
          sourceUrl: project.sourceUrl,
          grams,
          amsAffected: amsGrams > 0,
        })
        rows.set(key, row)
      }
    }

    return [...rows.values()].sort((a, b) => b.usedG - a.usedG)
  }, [plannedProjects])

  const totalWeight = summary.reduce((sum, row) => sum + row.usedG, 0)
  const selectedProfiles = plannedProjects.map(getSelectedProfile)
  const totalPlates = selectedProfiles.reduce((sum, profile) => sum + profile.plateCount, 0)
  const amsProjects = selectedProfiles.filter(hasAmsAffectedUsage).length
  const totalAmsAffectedWeight = summary.reduce((sum, row) => sum + row.amsUsedG, 0)
	  const purchaseRows = useMemo(() => {
	    const rows = new Map<string, { item: CatalogItem; rawRows: SummaryRow[]; usedG: number; amsUsedG: number }>()

	    for (const rawRow of summary) {
	      const item = getMappingDecision(rawRow, purchaseMappings[rawRow.key]).item
	      const current = rows.get(item.id) || { item, rawRows: [], usedG: 0, amsUsedG: 0 }
	      current.usedG += rawRow.usedG
	      current.amsUsedG += rawRow.amsUsedG
	      current.rawRows.push(rawRow)
	      rows.set(item.id, current)
    }

    return [...rows.values()]
      .map<PurchaseRow>((row) => {
        const { baseBufferG, amsExtraBufferG, requiredWithBuffer } = calculateBufferBreakdown(
          row.usedG,
          row.amsUsedG,
          bufferPct,
          amsBufferPct,
        )
        const ownedRolls = Number(inventory[row.item.id]?.rolls || 0)
        const effectiveSpoolSize = spoolSize || row.item.defaultSpoolG
        const ownedGrams = Math.round(ownedRolls * effectiveSpoolSize)
        const needToBuy = Math.max(0, requiredWithBuffer - ownedGrams)
        return {
          ...row,
          baseBufferG,
          amsExtraBufferG,
          requiredWithBuffer,
          ownedGrams,
          ownedRolls,
          needToBuy,
          spools: needToBuy === 0 ? 0 : Math.ceil(needToBuy / effectiveSpoolSize),
        }
      })
      .sort((a, b) => b.needToBuy - a.needToBuy)
  }, [amsBufferPct, bufferPct, inventory, purchaseMappings, spoolSize, summary])

  const totalRequiredWithBuffer = purchaseRows.reduce((sum, row) => sum + row.requiredWithBuffer, 0)
  const totalNeedToBuy = purchaseRows.reduce((sum, row) => sum + row.needToBuy, 0)
  const totalSpools = purchaseRows.reduce((sum, row) => sum + row.spools, 0)
  const manualMappingCount = summary.filter((row) => purchaseMappings[row.key]).length
  const plannedProjectCount = plannedProjects.length
  const purchaseColorGroupCount = purchaseRows.length
  const text = {
    topEyebrow: isEnglish ? 'Filament purchase planner' : '耗材采购规划',
    appTitle: isEnglish ? 'Multi-project filament purchase calculator' : '多项目耗材采购计算器',
    languageLabel: isEnglish ? 'Language' : '语言',
    statsIncluded: isEnglish ? `Included ${plannedProjectCount}/${projects.length}` : `已计入 ${plannedProjectCount}/${projects.length}`,
    statsPlates: isEnglish ? `${totalPlates} plates` : `共 ${totalPlates} 盘`,
    statsWeight: isEnglish ? `About ${Math.round(totalWeight)}g` : `约 ${Math.round(totalWeight)}g`,
    statsAms: isEnglish ? `${amsProjects} AMS projects` : `${amsProjects} 个 AMS 项目`,
    linksStep: isEnglish ? 'Model links' : '模型链接',
    profilesStep: isEnglish ? 'Print profiles' : '打印配置',
    matrixStep: isEnglish ? 'Color merge' : '颜色归并',
    purchaseStep: isEnglish ? 'Purchase list' : '采购清单',
    projectsMeta: isEnglish ? `${projects.length} projects` : `${projects.length} 个项目`,
    includedMeta: isEnglish ? `Included ${plannedProjectCount}/${projects.length}` : `已计入 ${plannedProjectCount}/${projects.length}`,
    colorsMeta: isEnglish
      ? `${purchaseColorGroupCount} purchase colors · ${manualMappingCount} manual`
      : `${purchaseColorGroupCount} 个购买色 · ${manualMappingCount} 手动`,
    purchaseMeta: formatRolls(totalSpools, isEnglish),
    pageTools: isEnglish ? 'Page tools' : '页面工具',
    plannerSteps: isEnglish ? 'Planner steps' : '规划步骤',
    helpDialog: isEnglish ? 'Help' : '帮助',
    closeHelp: isEnglish ? 'Close help' : '关闭帮助',
    introSummary: isEnglish ? 'Usage summary' : '使用说明摘要',
    gotIt: isEnglish ? 'Got it' : '我知道了',
    about: isEnglish ? 'About' : '关于',
    aboutTitle: isEnglish ? 'Filament purchase calculator' : '多项目耗材采购计算器',
    closeAbout: isEnglish ? 'Close about' : '关闭关于',
    version: isEnglish ? 'Version' : '版本号',
    openSourceNotice: isEnglish ? 'Open source notice' : '开源版权声明',
    openSourceBody: isEnglish
      ? 'This project is provided as-is for planning and review. Copyright belongs to the project contributors unless a separate LICENSE file states otherwise.'
      : '本项目按现状提供，用于打印采购规划与复核。除非仓库另有 LICENSE 文件说明，版权归项目贡献者所有。',
    dataRisk: isEnglish ? 'Data and purchase risk' : '数据与购买风险',
    dataRiskBody: isEnglish
      ? 'Filament grams come from MakerWorld profile metadata. This planner does not separately calculate AMS purge/flush waste, so color mapping, SKU, store inventory, price, and delivery region must be checked manually before purchase.'
      : '耗材克重来自 MakerWorld 打印配置元数据。本工具不会单独计算 AMS 换色/冲刷废料，颜色映射、SKU、商店库存、价格和配送地区都需要在下单前人工核对。',
    helpAndAbout: isEnglish ? 'Help and about' : '帮助和关于',
    help: isEnglish ? 'Help' : '帮助',
    introKicker: isEnglish ? 'Ready to use' : '打开就能用',
    hideIntro: isEnglish ? 'Hide intro' : '隐藏说明',
    showIntro: isEnglish ? 'Show intro' : '显示说明',
    introTitle: isEnglish
      ? 'Turn multiple MakerWorld models into one filament shopping plan'
      : '把多个 MakerWorld 模型变成一张耗材采购清单',
    introBody: isEnglish
      ? 'Use this before printing a batch of models to estimate grams by color, rolls to buy, and map MakerWorld colors to common Bambu Lab filament. The tool helps calculate, but it does not guarantee store inventory, prices, or exact color matches.'
      : '适合在打印一批模型前，先估算每种颜色要用多少克、需要买几卷，并把 MakerWorld 颜色映射到 Bambu Lab 常见耗材。工具会帮你算，但不会替你保证商品库存、价格或颜色完全一致。',
    introInputTitle: isEnglish ? 'Input' : '输入',
    introInput: isEnglish ? 'One MakerWorld model link per line' : 'MakerWorld 模型链接，每行一个',
    introCheckTitle: isEnglish ? 'Check' : '核对',
    introCheck: isEnglish ? 'Print profiles, color mapping, and owned stock' : '打印配置、颜色映射和已有库存',
    introOutputTitle: isEnglish ? 'Output' : '输出',
    introOutput: isEnglish ? 'Roll counts, cart links, copyable list, and CSV' : '采购卷数、购物车链接、复制清单和 CSV',
    introSaveTitle: isEnglish ? 'Saved' : '保存',
    introSave: isEnglish
      ? 'This plan is stored only in this browser so you can continue later'
      : '当前规划只保存在这个浏览器里，方便下次继续',
    introCollapsedTitle: isEnglish ? 'Intro hidden' : '说明已隐藏',
    introCollapsedBody: isEnglish
      ? 'Show it again when you need the input, review, output, or local-save explanation.'
      : '需要时可重新查看工具输入、核对项、输出和本地保存方式。',
    linksKicker: isEnglish ? 'Project links' : '项目链接',
    linksTitle: isEnglish ? 'MakerWorld model links' : 'MakerWorld 模型链接',
    clearPlan: isEnglish ? 'Clear current plan' : '清空当前规划',
    restoreSamples: isEnglish ? 'Restore sample links' : '恢复示例链接',
    linkNoteTitle: isEnglish ? 'Sample links are prefilled and can be replaced.' : '已预填示例链接，可直接替换。',
    linkNoteDomain: isEnglish
      ? 'Paste 1 MakerWorld model link per line. Both makerworld.com.cn and makerworld.com are supported.'
      : '每行 1 个 MakerWorld 模型链接，支持 makerworld.com.cn / makerworld.com。',
    linkNoteProfile: isEnglish
      ? 'Add #profileId-xxxx at the end of a link to specify a print profile.'
      : '可在链接末尾使用 #profileId-xxxx 指定打印配置。',
    linkPlaceholder: isEnglish
      ? 'Paste one MakerWorld model link per line, for example: https://makerworld.com/en/models/123456-...'
      : '每行粘贴一个 MakerWorld 模型链接，例如：https://makerworld.com.cn/zh/models/123456-...',
    resolving: isEnglish ? 'Resolving...' : '正在解析...',
    resolveLinks: isEnglish ? 'Resolve links' : '解析链接',
    continueProfiles: isEnglish ? 'Continue to print profiles' : '继续选择打印配置',
    projectLinksAria: isEnglish ? 'Project links' : '项目链接',
    makerWorldLinksAria: isEnglish ? 'MakerWorld links' : 'MakerWorld 链接',
    profilesAria: isEnglish ? 'Print profiles' : '打印配置',
    matrixKicker: isEnglish ? 'Color matrix' : '颜色矩阵',
    matrixTitle: isEnglish ? 'Projects x color usage' : '项目 × 颜色用量',
    profileTitle: isEnglish ? 'Choose print profiles' : '选择要打印的配置',
    publicModelData: isEnglish ? 'Public model data' : '公开模型数据',
    colorsCount: isEnglish ? `${summary.length} colors` : `${summary.length} 个颜色`,
    includedCount: isEnglish ? `Included ${plannedProjectCount}/${projects.length}` : `已计入 ${plannedProjectCount}/${projects.length}`,
    includeAll: isEnglish ? 'Include all' : '全部计入',
    clear: isEnglish ? 'Clear' : '清空',
    targetPrinter: isEnglish ? 'Target printer' : '目标打印机',
    anyPrinter: isEnglish ? 'Any printer' : '任意打印机',
    autoPickProfiles: isEnglish ? 'Auto-select matching profiles' : '自动选择匹配配置',
    sortBy: isEnglish ? 'Sort by' : '排序方式',
    sortDefault: isEnglish ? 'MakerWorld default' : 'MakerWorld 默认',
    sortDownloads: isEnglish ? 'Most downloads' : '下载最多',
    sortRatings: isEnglish ? 'Most ratings' : '评分数最多',
    sortPrints: isEnglish ? 'Most prints' : '打印次数最多',
    sortTime: isEnglish ? 'Shortest time' : '耗时最短',
    sortMaterial: isEnglish ? 'Least material' : '用料最少',
    toolbarHelp: isEnglish
      ? 'Current selections are replaced by printer compatibility. Still confirm size and settings in the slicer.'
      : '会按打印机兼容度替换当前选择，仍建议进切片软件确认尺寸和参数',
    profileBadgeLegendAria: isEnglish ? 'Profile symbol legend' : '配置符号说明',
    emptyProfilesTitle: isEnglish ? 'Waiting for model links' : '等待解析模型链接',
    emptyProfilesBody: isEnglish
      ? 'Resolve the samples or your own links to load MakerWorld print profiles.'
      : '解析示例或你自己的链接后，会加载 MakerWorld 打印配置。',
    includeInPlan: isEnglish ? 'Include in plan' : '计入计划',
    removeFromPlan: isEnglish ? 'Remove from plan' : '从计划移除',
    included: isEnglish ? 'Included' : '已计入',
    skipped: isEnglish ? 'Skipped' : '已跳过',
    open: isEnglish ? 'Open' : '打开',
    fill: isEnglish ? 'infill' : '填充',
    needsAms: isEnglish ? 'Needs AMS' : '需要 AMS',
    noAms: isEnglish ? 'No AMS' : '无需 AMS',
    colorsAria: isEnglish ? 'colors' : '颜色',
    profileComparisonAria: isEnglish ? 'profile comparison' : '配置对比',
    profileMetricsAria: isEnglish ? 'profile metrics' : '配置指标',
    estimatedTime: isEnglish ? 'Est. time' : '预计时间',
    plateCount: isEnglish ? 'Plates' : '盘数',
    rating: isEnglish ? 'Rating' : '评分',
    downloads: isEnglish ? 'Downloads' : '下载',
    prints: isEnglish ? 'Prints' : '打印',
    continueMatrix: isEnglish ? 'Continue to color merge' : '继续归并颜色',
    project: isEnglish ? 'Project' : '项目',
    noIncludedTitle: isEnglish ? 'No projects included yet' : '还没有计入项目',
    noIncludedBody: isEnglish
      ? 'First include projects on the print profiles page.'
      : '请先在打印配置页勾选要纳入采购计算的项目。',
    purchaseMappingTitle: isEnglish ? 'Purchase color groups' : '购买颜色分组',
    mappingSubtitle: isEnglish ? 'Merge raw model colors into Bambu purchase colors' : '把原始模型颜色归并到 Bambu 购买颜色',
    mappingLegendAria: isEnglish ? 'Color mapping risk legend' : '颜色映射风险说明',
    riskOk: isEnglish ? 'Green: usually ready to use' : '绿色可直接用',
    riskWarning: isEnglish ? 'Yellow: review suggested' : '黄色建议看一眼',
    riskDanger: isEnglish ? 'Red: confirm before purchase' : '红色下单前必须确认',
    mappingHelp: isEnglish
      ? 'Select raw colors in the matrix or chips, then merge the selection into one purchase color.'
      : '在矩阵或 chip 中选择原始颜色，再统一合并到一个购买颜色。',
    selectedRawColors: (count: number, grams: number) =>
      isEnglish ? `${count} raw colors selected · ${grams}g total` : `已选 ${count} 个原始颜色 · 合计 ${grams}g`,
    mixedMaterialSelection: isEnglish
      ? 'Selected colors use different materials. Clear the selection and merge one material at a time.'
      : '已选颜色包含不同材料，请清除后按同一种材料分别合并。',
    restoreSelected: isEnglish ? 'Restore selected auto mappings' : '恢复选中自动映射',
    batchMappingTarget: isEnglish ? 'Target Bambu color' : '目标 Bambu 颜色',
    mergeToPurchaseColor: isEnglish ? 'Merge into purchase color' : '合并到购买颜色',
    clearSelection: isEnglish ? 'Clear selection' : '清除选择',
    continuePurchase: isEnglish ? 'Continue to purchase list' : '继续生成采购清单',
    whyMapped: isEnglish ? 'Why this mapping' : '为什么这样映射',
    original: isEnglish ? 'Raw grams' : '原始量',
    automatic: isEnglish ? 'Auto' : '自动',
    current: isEnglish ? 'Current' : '当前',
    restoreMappingBody: isEnglish
      ? 'Restoring removes the manual selection and returns to the automatic mapping above.'
      : '恢复会移除手动指定，并回到上方的自动映射结果。',
    restoreAutoMapping: isEnglish ? 'Restore auto mapping' : '恢复自动映射',
    restore: isEnglish ? 'Restore' : '恢复',
    rawUsage: isEnglish ? 'Raw usage' : '原始用量',
    rawColors: isEnglish ? 'Raw colors' : '原始颜色',
    includedRawColors: isEnglish ? 'Included raw colors' : '包含原始颜色',
    purchaseColorGroups: isEnglish ? 'Purchase color groups' : '购买颜色组',
    total: isEnglish ? 'Total' : '合计',
    sameTarget: (count: number) => (isEnglish ? `${count} same target` : `${count} 个同目标`),
    sameFamily: (count: number) => (isEnglish ? `${count} same family` : `${count} 个同色系`),
    purchasePlan: isEnglish ? 'Purchase plan' : '采购计划',
    purchaseSummary: isEnglish ? 'Purchase summary' : '采购汇总',
    shoppingSummaryAria: isEnglish ? 'Shopping summary' : '采购汇总',
    purchaseReminder: isEnglish ? 'Before buying' : '购物前提醒',
    reminderStore: isEnglish
      ? 'Cart links currently point to the Bambu Lab US store.'
      : '购物车链接目前指向 Bambu Lab US 商店。',
    reminderStock: isEnglish
      ? 'Store pages are the source of truth for stock, price, and delivery region.'
      : '库存、价格、配送地区以商店页面为准。',
    reminderWaste: isEnglish
      ? 'Raw grams come from MakerWorld. The AMS extra buffer below is a purchase safety margin because MakerWorld does not expose purge/flush waste as separate fields.'
      : '原始克重来自 MakerWorld。下方 AMS 额外余量是采购安全垫，因为 MakerWorld 未把 purge/flush 废料作为独立字段暴露。',
    reminderMapping: isEnglish
      ? 'Color mapping includes automatic estimates. Check color names, SKU, and quantity before ordering.'
      : '颜色映射含自动推测，下单前请核对颜色名、SKU、数量。',
    purchaseRules: isEnglish ? 'Purchase rules' : '采购规则',
    buyingRules: isEnglish ? 'Buying rules' : '购买规则',
    purchaseScope: isEnglish ? 'Purchase scope' : '采购范围',
    buffer: isEnglish ? 'Safety buffer' : '安全余量',
    bufferAria: isEnglish ? 'Safety buffer percentage' : '安全余量百分比',
    bufferHelp: isEnglish ? 'Added to every planned gram. Range 0-100%.' : '作用于全部计划用量，范围 0-100%。',
    amsBuffer: isEnglish ? 'AMS extra buffer' : 'AMS 额外余量',
    amsBufferAria: isEnglish ? 'AMS extra buffer percentage' : 'AMS 额外余量百分比',
    amsBufferHelp: isEnglish
      ? 'Only added to grams from AMS or multi-color profiles. Range 0-100%.'
      : '只叠加到需要 AMS 或多色配置的克重，范围 0-100%。',
    spoolWeight: isEnglish ? 'Grams per roll' : '每卷克重',
    spoolWeightAria: isEnglish ? 'Grams per roll' : '每卷克重',
    spoolWeightHelp: isEnglish ? 'Used to convert stock and roll count. Range 100-5000g.' : '用于折算库存和购买卷数，范围 100-5000g。',
    rawTotal: isEnglish ? 'Raw total' : '原始合计',
    amsAffected: isEnglish ? 'AMS affected' : 'AMS 影响',
    amsExtra: isEnglish ? 'AMS extra' : 'AMS 额外',
    bufferedTotal: isEnglish ? 'With buffer' : '含余量',
    needToBuy: isEnglish ? 'Need to buy' : '需购买',
    purchaseProjectFilterAria: isEnglish ? 'Purchase project filter' : '采购项目筛选',
    removeFromPurchase: isEnglish ? 'Remove from purchase plan' : '从采购计划移除',
    includeInPurchase: isEnglish ? 'Include in purchase plan' : '计入采购计划',
    purchaseList: isEnglish ? 'Purchase list' : '采购清单',
    purchaseSubhead: isEnglish
      ? `${plannedProjectCount} projects · need ${totalNeedToBuy}g`
      : `${plannedProjectCount} 个项目 · 需购买 ${totalNeedToBuy}g`,
    purchaseAction: isEnglish ? 'Buy' : '购买',
    copied: isEnglish ? 'Copied' : '已复制',
    copyList: isEnglish ? 'Copy table' : '复制表格',
    exportCsv: isEnglish ? 'Export CSV' : '导出 CSV',
    emptyPurchaseTitle: isEnglish ? 'No purchase list yet' : '还没有采购清单',
    emptyPurchaseBody: isEnglish
      ? 'First select projects to include on the print profiles page.'
      : '请先在打印配置页选择要计入的项目。',
    withBuffer: isEnglish ? 'with buffer' : '含余量',
    amsAffectedUsage: isEnglish ? 'AMS affected usage' : 'AMS 影响用量',
    baseBufferG: isEnglish ? 'Safety buffer' : '安全余量',
    amsExtraBufferG: isEnglish ? 'AMS extra' : 'AMS 额外量',
    calculation: isEnglish ? 'Calculation' : '计算关系',
    finalRequired: isEnglish ? 'Required after buffers' : '余量后需要',
    stockDeduction: isEnglish ? 'Stock deduction' : '库存抵扣',
    ownedApprox: (grams: number) => (isEnglish ? `Owned: about ${grams}g` : `已有约 ${grams}g`),
    amsAffectedTag: isEnglish ? 'AMS buffer applies' : 'AMS 余量适用',
    noAmsAffectedTag: isEnglish ? 'No AMS extra buffer' : '无 AMS 额外余量',
    ownedStock: isEnglish ? 'Owned stock' : '已有库存',
    stockPlaceholder: '0.5',
    rollUnit: isEnglish ? 'rolls' : '卷',
    ownedGrams: (grams: number) =>
      isEnglish ? `Converted by roll weight: about ${grams}g owned` : `按每卷克重折算，已有约 ${grams}g`,
    projectsUnit: (count: number) => (isEnglish ? `${count} projects` : `${count} 个项目`),
    sourceProjects: isEnglish ? 'Source projects' : '来源项目',
    projectColorDetails: isEnglish ? 'Project color details' : '项目颜色明细',
    projectDetails: isEnglish ? 'Project details' : '项目明细',
    detailColumn: isEnglish ? 'Details' : '明细',
    projectPrefix: isEnglish ? 'Project' : '项目',
    expandProjectDetails: (count: number) => (isEnglish ? `Show ${count}` : `展开 ${count} 项目`),
    collapseProjectDetails: isEnglish ? 'Collapse' : '收起',
    expandAll: isEnglish ? 'Expand all' : '全部展开',
    collapseAll: isEnglish ? 'Collapse all' : '全部收起',
    calculationDetails: isEnglish ? 'Calculation details' : '计算明细',
    sourceAndCalculation: isEnglish ? 'Sources and calculation' : '来源与计算',
    openBuyRolls: () => (isEnglish ? 'Buy' : '购买'),
    viewProduct: isEnglish ? 'Buy' : '购买',
  }
  const steps: Array<{ id: StepId; label: string; meta: string }> = [
    { id: 'links', label: text.linksStep, meta: text.projectsMeta },
    { id: 'profiles', label: text.profilesStep, meta: text.includedMeta },
    { id: 'matrix', label: text.matrixStep, meta: text.colorsMeta },
    { id: 'purchase', label: text.purchaseStep, meta: text.purchaseMeta },
  ]
  const orderedSummary = useMemo(
    () => [...summary].sort((left, right) => compareSummaryRowsForMapping(left, right, purchaseMappings)),
    [purchaseMappings, summary],
  )
  const selectedRawRows = useMemo(
    () => orderedSummary.filter((row) => selectedRawKeys.includes(row.key)),
    [orderedSummary, selectedRawKeys],
  )
  const selectedRawTotalG = selectedRawRows.reduce((sum, row) => sum + row.usedG, 0)
  const hasMixedSelectedMaterials =
    selectedRawRows.length > 1 && !selectedRawRows.every((row) => row.type === selectedRawRows[0].type)
  const selectedTargetOptions = useMemo(() => {
    const selectedMaterial =
      selectedRawRows.length > 0 && selectedRawRows.every((row) => row.type === selectedRawRows[0].type)
        ? selectedRawRows[0].type.toUpperCase()
        : null
    const options = selectedMaterial
      ? bambuCatalog.filter((item) => item.material === selectedMaterial)
      : bambuCatalog
    const currentTarget = bambuCatalog.find((item) => item.id === batchMappingItemId)
    return options.some((item) => item.id === batchMappingItemId)
      ? options
      : currentTarget
        ? [currentTarget, ...options]
        : options
  }, [batchMappingItemId, selectedRawRows])
  const selectedBatchMappingItem =
    selectedTargetOptions.find((item) => item.id === batchMappingItemId) ||
    bambuCatalog.find((item) => item.id === batchMappingItemId) ||
    selectedTargetOptions[0]

  const matrixRows = useMemo(
    () =>
      plannedProjects.map((project) => {
        const profile = getSelectedProfile(project)
        const byColor = new Map<string, number>()
        for (const filament of profile.filaments) {
          byColor.set(filamentKey(filament), (byColor.get(filamentKey(filament)) || 0) + filament.usedG)
        }
        return { project, profile, byColor }
      }),
    [plannedProjects],
  )

  const shoppingText = (() => {
    const header = purchaseRows[0]?.rawRows ? getPurchaseTableCells(purchaseRows[0]).map((cell) => cell.label) : []
    const rows = purchaseRows.map((row) => getPurchaseTableCells(row).map((cell) => cell.value))
    const meta = [
      isEnglish ? 'Copied from purchase list table' : '复制自采购清单表格',
      isEnglish
        ? `Projects: ${plannedProjectCount}/${projects.length}; raw ${Math.round(totalWeight)}g; required ${totalRequiredWithBuffer}g; buy ${totalNeedToBuy}g`
        : `项目: ${plannedProjectCount}/${projects.length}；原始 ${Math.round(totalWeight)}g；余量后 ${totalRequiredWithBuffer}g；需购买 ${totalNeedToBuy}g`,
      '',
    ]
    return [...meta, [header.join('\t'), ...rows.map((row) => row.join('\t'))].join('\n')].join('\n')
  })()

  async function copyShoppingList() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shoppingText)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = shoppingText
        textarea.setAttribute('readonly', '')
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopyState('copied')
      window.setTimeout(() => setCopyState('idle'), 1400)
    } catch (error) {
      setErrors((current) => [
        ...current,
        {
          sourceUrl: 'clipboard',
          error: error instanceof Error ? error.message : isEnglish ? 'Copy failed' : '复制失败',
        },
      ])
    }
  }

  function exportCsv() {
    const header = purchaseRows[0]?.rawRows ? getPurchaseTableCells(purchaseRows[0]).map((cell) => cell.label) : []
    const rows = purchaseRows.map((row) =>
      getPurchaseTableCells(row)
        .map((cell) => `"${String(cell.value).replaceAll('"', '""')}"`)
        .join(','),
    )
    const blob = new Blob([[header.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'filament-purchase-plan.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  async function resolveLinks() {
    if (!hasResolvableLinks) return
    setIsResolving(true)
    setErrors([])
    try {
      const urls = links
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)

      const response = await fetch('/api/resolve', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ urls }),
      })

      const responseText = await response.text()
      let payload: ResolveResponse | { error: string }
      try {
        payload = JSON.parse(responseText) as ResolveResponse | { error: string }
      } catch {
        throw new Error(
          response.ok
            ? isEnglish
              ? 'Resolve service returned an invalid response.'
              : '解析服务返回了无效响应。'
            : isEnglish
              ? `Resolve service is unavailable (${response.status}).`
              : `解析服务不可用（${response.status}）。`,
        )
      }
      if (!response.ok) {
        throw new Error('error' in payload ? payload.error : isEnglish ? 'Resolve failed' : '解析失败')
      }

	      if ('projects' in payload) {
	        setProjects(payload.projects)
          setManualProfileSelections({})
          clearRawSelection()
          setFocusedColorKey(null)
          setOpenProfilePickerId(null)
	        setIncludedProjectIds(payload.projects.map((project) => project.designId))
	        setErrors(payload.errors || [])
	        if (payload.projects.length > 0) {
	          setActiveStep('profiles')
	        }
	      }
    } catch (error) {
      setErrors([
        {
          sourceUrl: 'resolve',
          error: error instanceof Error ? error.message : isEnglish ? 'Resolve failed' : '解析失败',
        },
      ])
    } finally {
      setIsResolving(false)
    }
  }

  function updateSelectedProfile(projectId: number, instanceId: number) {
    setProjects((current) =>
      current.map((project) =>
        project.designId === projectId ? { ...project, selectedInstanceId: instanceId } : project,
      ),
    )
    setManualProfileSelections((current) => ({ ...current, [projectId]: true }))
    clearRawSelection()
    setFocusedColorKey(null)
    setOpenProfilePickerId(null)
  }

  function pickMatchingProfiles() {
    if (targetPrinter === anyPrinter) return
    setOpenProfilePickerId(null)
    clearRawSelection()
    setFocusedColorKey(null)
    const autoSelectedProjectIds = new Set<number>()
    setProjects((current) =>
      current.map((project) => {
        const matchingProfile = sortProfiles(project.instances, profileSort, targetPrinter).find((profile) =>
          profileMatchesPrinter(profile, targetPrinter),
        )
        if (matchingProfile) autoSelectedProjectIds.add(project.designId)
        return matchingProfile ? { ...project, selectedInstanceId: matchingProfile.instanceId } : project
      }),
    )
    setManualProfileSelections((current) => {
      const next = { ...current }
      for (const projectId of autoSelectedProjectIds) {
        delete next[projectId]
      }
      return next
    })
  }

  function setAllProjectsIncluded(includeAll: boolean) {
    setIncludedProjectIds(includeAll ? allProjectIds : [])
    clearRawSelection()
    setFocusedColorKey(null)
  }

  function resetPlanner() {
    setLinks('')
    setProjects([])
    setIncludedProjectIds(null)
    setErrors([])
    setPurchaseMappings({})
    setManualProfileSelections({})
    clearRawSelection()
    setFocusedColorKey(null)
    setActiveStep('links')
  }

  function closeHelp() {
    localStorage.setItem('filamentPlanner.helpSeen', 'true')
    setActiveModal(null)
  }

  function toggleProjectIncluded(projectId: number) {
    clearRawSelection()
    setFocusedColorKey(null)
    setIncludedProjectIds((current) => {
      const currentIds = current ?? allProjectIds
      return currentIds.includes(projectId)
        ? currentIds.filter((id) => id !== projectId)
        : [...currentIds, projectId]
    })
  }

  function toggleColorSelection(rowKey: string, source: RawSelectionSource, step: StepId = 'matrix') {
    setRawSelection((current) => {
      const isSameSource = current.source === source
      const workingSelection = isSameSource ? current.keys : []
      const isSelected = workingSelection.includes(rowKey)
      const row = orderedSummary.find((candidate) => candidate.key === rowKey)
      if (!isSelected && row && workingSelection.length === 0) {
        setBatchMappingItemId(getMappingDecision(row, purchaseMappings[row.key]).item.id)
      }
      const next = isSelected ? workingSelection.filter((key) => key !== rowKey) : [...workingSelection, rowKey]
      setFocusedColorKey(next.length > 0 ? (isSelected ? next[0] : rowKey) : null)
      return { keys: next, source: next.length > 0 ? source : null }
    })
    setActiveStep(step)
  }

  function toggleRawColorGroup(rows: SummaryRow[], step: StepId = 'matrix') {
    const groupKeys = rows.map((row) => row.key)
    if (groupKeys.length === 0) return

    setRawSelection((current) => {
      const isSameSource = current.source === 'mapping'
      const workingSelection = isSameSource ? current.keys : []
      const groupKeySet = new Set(groupKeys)
      const allSelected = groupKeys.every((key) => workingSelection.includes(key))
      const next = allSelected
        ? workingSelection.filter((key) => !groupKeySet.has(key))
        : Array.from(new Set([...workingSelection, ...groupKeys]))

      if (!allSelected && workingSelection.length === 0) {
        setBatchMappingItemId(getMappingDecision(rows[0], purchaseMappings[rows[0].key]).item.id)
      }
      setFocusedColorKey(next.length > 0 ? groupKeys[0] : null)
      return { keys: next, source: next.length > 0 ? 'mapping' : null }
    })
    setActiveStep(step)
  }

  function handleColorKey(event: KeyboardEvent, rowKey: string, source: RawSelectionSource = 'matrix') {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    toggleColorSelection(rowKey, source)
  }

  function handleRawColorGroupKey(event: KeyboardEvent, rows: SummaryRow[]) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    toggleRawColorGroup(rows)
  }

  function closeBatchColorMenuOnBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsBatchColorMenuOpen(false)
    }
  }

  function commitBufferPctInput() {
    const next = normalizeNumberInput(bufferPctInput, bufferPct, 0, 100)
    setBufferPct(next)
    setBufferPctInput(String(next))
  }

  function commitAmsBufferPctInput() {
    const next = normalizeNumberInput(amsBufferPctInput, amsBufferPct, 0, 100)
    setAmsBufferPct(next)
    setAmsBufferPctInput(String(next))
  }

  function commitSpoolSizeInput() {
    const next = normalizeNumberInput(spoolSizeInput, spoolSize, 100, 5000)
    setSpoolSize(next)
    setSpoolSizeInput(String(next))
  }

  function commitRuleInputOnEnter(event: KeyboardEvent<HTMLInputElement>, commit: () => void) {
    if (event.key !== 'Enter') return
    event.currentTarget.blur()
    commit()
  }

  function togglePurchaseRowDetails(rowId: string) {
    setExpandedPurchaseRowIds((current) =>
      current.includes(rowId) ? current.filter((id) => id !== rowId) : [...current, rowId],
    )
  }

	  function applyBatchMapping() {
    const keys = selectedRawRows.map((row) => row.key)
	    if (!batchMappingItemId || keys.length === 0 || hasMixedSelectedMaterials) return
	    setPurchaseMappings((current) => ({
	      ...current,
	      ...Object.fromEntries(keys.map((key) => [key, batchMappingItemId])),
	    }))
	  }

	  function focusColor(rowKey: string, step: StepId = 'matrix') {
	    setFocusedColorKey(rowKey)
    setRawSelection((current) =>
      current.source === 'matrix' && current.keys.includes(rowKey)
        ? current
        : { keys: [rowKey], source: 'matrix' },
    )
	    setActiveStep(step)
	  }

	  function restoreMappings(keys: string[]) {
	    if (keys.length === 0) return
	    setPurchaseMappings((current) => {
	      const next = { ...current }
	      for (const key of keys) {
	        delete next[key]
	      }
	      return next
	    })
	  }

	  function restoreSelectedMappings() {
	    restoreMappings(selectedRawRows.map((row) => row.key))
	    clearRawSelection()
	  }

  function getRawColorSummary(row: PurchaseRow) {
    return row.rawRows
      .slice(0, 3)
      .map((rawRow) => `${rawRow.type} ${colorNames[rawRow.color] || rawRow.color} ${rawRow.usedG}g`)
      .join(isEnglish ? ', ' : '、')
  }

  function getProjectNumber(designId: number) {
    const index = plannedProjects.findIndex((project) => project.designId === designId)
    return index >= 0 ? index + 1 : 0
  }

  function getPurchaseProjectRefs(row: PurchaseRow) {
    return Array.from(
      new Set(
        row.rawRows
          .flatMap((rawRow) => rawRow.projects.map((project) => getProjectNumber(project.designId)))
          .filter((number) => number > 0),
      ),
    ).join(', ')
  }

  function getPurchaseProjectColorDetails(row: PurchaseRow) {
    return getPurchaseProjectColorDetailRows(row)
      .map((detail) => `${detail.projectNumber}: ${detail.colors.join(isEnglish ? '; ' : '；')}`)
      .join(isEnglish ? ' | ' : ' | ')
  }

  function getPurchaseProjectColorDetailRows(row: PurchaseRow) {
    const details = new Map<number, string[]>()
    const titles = new Map<number, string>()
    const gramsByProject = new Map<number, number>()
    const amsGramsByProject = new Map<number, number>()

    for (const rawRow of row.rawRows) {
      for (const project of rawRow.projects) {
        const projectNumber = getProjectNumber(project.designId)
        if (projectNumber <= 0) continue
        const current = details.get(projectNumber) || []
        current.push(`${rawRow.type} ${colorNames[rawRow.color] || rawRow.color} ${project.grams}g`)
        details.set(projectNumber, current)
        titles.set(projectNumber, project.title)
        gramsByProject.set(projectNumber, (gramsByProject.get(projectNumber) || 0) + project.grams)
        amsGramsByProject.set(
          projectNumber,
          (amsGramsByProject.get(projectNumber) || 0) + (project.amsAffected ? project.grams : 0),
        )
      }
    }

    return Array.from(details.entries())
      .sort(([left], [right]) => left - right)
      .map(([projectNumber, colors]) => {
        const usedG = gramsByProject.get(projectNumber) || 0
        const amsUsedG = amsGramsByProject.get(projectNumber) || 0
        const { baseBufferG, amsExtraBufferG, requiredWithBuffer } = calculateBufferBreakdown(
          usedG,
          amsUsedG,
          bufferPct,
          amsBufferPct,
        )
        return {
          projectNumber,
          projectTitle: titles.get(projectNumber) || '',
          colors,
          usedG,
          baseBufferG,
          amsExtraBufferG,
          requiredWithBuffer,
        }
      })
  }

  function getPurchaseTableCells(row: PurchaseRow) {
    const rowCartUrl = buildCartUrl(row.item, row.spools)
    return [
      {
        key: 'purchase_item',
        label: text.purchaseList,
        value: `${row.item.line} ${row.item.colorName}${row.item.sku ? ` (${row.item.sku})` : ''}`,
      },
      { key: 'raw_g', label: text.original, value: `${row.usedG}g` },
      { key: 'safety_buffer_g', label: text.baseBufferG, value: `${row.baseBufferG}g` },
      { key: 'ams_extra_g', label: text.amsExtraBufferG, value: `${row.amsExtraBufferG}g` },
      { key: 'required_g', label: text.finalRequired, value: `${row.requiredWithBuffer}g` },
      { key: 'owned_rolls', label: text.stockDeduction, value: `${row.ownedRolls || 0} ${text.rollUnit}` },
      { key: 'need_to_buy', label: text.needToBuy, value: `${formatRolls(row.spools, isEnglish)} / ${row.needToBuy}g` },
      { key: 'source_projects', label: text.sourceProjects, value: getPurchaseProjectRefs(row) },
      { key: 'project_color_details', label: text.projectColorDetails, value: getPurchaseProjectColorDetails(row) },
      { key: 'raw_colors', label: text.rawUsage, value: getRawColorSummary(row) },
      { key: 'purchase_url', label: text.purchaseAction, value: rowCartUrl },
    ]
  }

  function renderProfileBadgeSymbols(badges: ProfileBadge[], className = '') {
    if (badges.length === 0) return null
    return (
      <span className={cx('profile-picker-badges', className)} aria-hidden="true">
        {badges.map((badge) => (
          <i className={cx('profile-badge', `profile-badge-${badge.tone}`)} key={badge.key} title={badge.title}>
            {badge.symbol}
          </i>
        ))}
      </span>
    )
  }

	  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">{text.topEyebrow}</p>
          <h1>{text.appTitle}</h1>
        </div>
        <div className="topbar-tools" aria-label={text.pageTools}>
          <label className="language-switch">
            <span>{text.languageLabel}</span>
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value as Language)}
              aria-label={text.languageLabel}
            >
              <option value="zh">中文</option>
              <option value="en">English</option>
            </select>
          </label>
        </div>
	      </header>

	      <nav className="flow-nav" aria-label={text.plannerSteps}>
	        {steps.map((step, index) => (
	          <button
	            key={step.id}
	            className={activeStep === step.id ? 'active' : ''}
	            type="button"
	            onClick={() => setActiveStep(step.id)}
	            aria-current={activeStep === step.id ? 'step' : undefined}
	          >
	            <span>{index + 1}</span>
	            <strong>{step.label}</strong>
	            <small>{step.meta}</small>
	          </button>
	        ))}
	      </nav>

      {activeModal === 'help' && (
        <div className="help-modal-backdrop" role="presentation">
          <section className="help-modal" role="dialog" aria-modal="true" aria-label={text.helpDialog}>
            <div className="help-modal-heading">
              <div>
                <p className="section-kicker">{text.introKicker}</p>
                <h2>{text.introTitle}</h2>
              </div>
              <button className="icon-button" type="button" onClick={closeHelp} aria-label={text.closeHelp}>
                <X size={18} />
              </button>
            </div>
            <p className="help-modal-copy">{text.introBody}</p>
            <div className="intro-points" aria-label={text.introSummary}>
              <span>
                <strong>{text.introInputTitle}</strong>
                {text.introInput}
              </span>
              <span>
                <strong>{text.introCheckTitle}</strong>
                {text.introCheck}
              </span>
              <span>
                <strong>{text.introOutputTitle}</strong>
                {text.introOutput}
              </span>
              <span>
                <strong>{text.introSaveTitle}</strong>
                {text.introSave}
              </span>
            </div>
            <button className="primary-action help-confirm" type="button" onClick={closeHelp}>
              {text.gotIt}
            </button>
          </section>
        </div>
      )}

      {activeModal === 'about' && (
        <div className="help-modal-backdrop" role="presentation">
          <section className="help-modal about-modal" role="dialog" aria-modal="true" aria-label={text.about}>
            <div className="help-modal-heading">
              <div>
                <p className="section-kicker">{text.about}</p>
                <h2>{text.aboutTitle}</h2>
              </div>
              <button className="icon-button" type="button" onClick={() => setActiveModal(null)} aria-label={text.closeAbout}>
                <X size={18} />
              </button>
            </div>
            <div className="about-list">
              <span>
                <strong>{text.version}</strong>
                v0.0.0
              </span>
              <span>
                <strong>{text.openSourceNotice}</strong>
                {text.openSourceBody}
              </span>
              <span>
                <strong>{text.dataRisk}</strong>
                {text.dataRiskBody}
              </span>
            </div>
          </section>
        </div>
      )}

      <div className="corner-actions" aria-label={text.helpAndAbout}>
        <button type="button" onClick={() => setActiveModal('help')}>
          <HelpCircle size={18} />
          {text.help}
        </button>
        <button type="button" onClick={() => setActiveModal('about')}>
          <Info size={18} />
          {text.about}
        </button>
      </div>
	
	      <section className="workspace flow-workspace">
	        <aside className={cx('input-panel', 'flow-panel', activeStep === 'links' && 'active')} aria-label={text.projectLinksAria}>
          <div className="panel-heading">
            <div>
              <p className="section-kicker">{text.linksKicker}</p>
              <h2>{text.linksTitle}</h2>
            </div>
            <div className="panel-actions">
              <button className="text-button" type="button" onClick={resetPlanner}>
                {text.clearPlan}
              </button>
              <button className="icon-button" type="button" onClick={() => setLinks(sampleLinks)} title={text.restoreSamples}>
                <RotateCcw size={18} />
              </button>
            </div>
          </div>
          <div className="link-format-note">
            <strong>{text.linkNoteTitle}</strong>
            <span>{text.linkNoteDomain}</span>
            <span>{text.linkNoteProfile}</span>
          </div>

          <textarea
            value={links}
            onChange={(event) => setLinks(event.target.value)}
            spellCheck={false}
            aria-label={text.makerWorldLinksAria}
            placeholder={text.linkPlaceholder}
          />

          <button className="primary-action" type="button" onClick={resolveLinks} disabled={isResolving || !hasResolvableLinks}>
            {isResolving ? <Sparkles size={18} /> : <Link size={18} />}
            {isResolving ? text.resolving : text.resolveLinks}
          </button>

          {errors.length > 0 && (
            <div className="error-list">
              {errors.map((error) => (
                <div key={`${error.sourceUrl}-${error.error}`} className="error-row">
                  <AlertCircle size={16} />
                  <span>{error.error}</span>
                </div>
              ))}
            </div>
          )}

	        </aside>

	        <section
	          className={cx(
	            'project-panel',
	            'flow-panel',
	            (activeStep === 'profiles' || activeStep === 'matrix') && 'active',
	            activeStep === 'matrix' ? 'matrix-mode' : 'profiles-mode',
	          )}
	          aria-label={activeStep === 'matrix' ? text.matrixTitle : text.profilesAria}
	        >
	          <div className="panel-heading">
	            <div>
	              <p className="section-kicker">{activeStep === 'matrix' ? text.matrixKicker : text.profilesStep}</p>
	              <h2>{activeStep === 'matrix' ? text.matrixTitle : text.profileTitle}</h2>
	            </div>
	            <span className="status-pill">
	              {activeStep === 'matrix' ? <Table2 size={16} /> : <CheckCircle2 size={16} />}
	              {activeStep === 'matrix' ? text.colorsCount : text.publicModelData}
		            </span>
		          </div>

		          {activeStep === 'profiles' && projects.length > 0 && (
		            <div className="profile-toolbar">
		              <div className="toolbar-segment toolbar-segment-projects">
		                <span className="toolbar-segment-title">{text.includedCount}</span>
		                <div className="plan-toolbar" aria-label={text.includedCount}>
		                  <button type="button" onClick={() => setAllProjectsIncluded(true)}>
		                    {text.includeAll}
		                  </button>
		                  <button type="button" onClick={() => setAllProjectsIncluded(false)}>
		                    {text.clear}
		                  </button>
		                </div>
		              </div>
		              <div className="toolbar-segment toolbar-segment-printer">
		                <span className="toolbar-segment-title">{text.targetPrinter}</span>
		                <div className="toolbar-control-row">
		                  <select
		                    value={targetPrinter}
		                    onChange={(event) => setTargetPrinter(event.target.value)}
		                    aria-label={text.targetPrinter}
		                  >
		                    <option value={anyPrinter}>{text.anyPrinter}</option>
		                    {printerOptions.map((printer) => (
		                      <option key={printer} value={printer}>
		                        {printer}
		                      </option>
		                    ))}
		                  </select>
		                  <button
		                    className="toolbar-action"
		                    type="button"
		                    onClick={pickMatchingProfiles}
		                    disabled={targetPrinter === anyPrinter}
		                  >
		                    {text.autoPickProfiles}
		                  </button>
		                </div>
		              </div>
		              <div className="toolbar-segment toolbar-segment-sort">
		                <span className="toolbar-segment-title">{text.sortBy}</span>
		                <select
		                  value={profileSort}
		                  onChange={(event) => setProfileSort(event.target.value as ProfileSort)}
		                  aria-label={text.sortBy}
		                >
		                  <option value="default">{text.sortDefault}</option>
		                  <option value="downloads">{text.sortDownloads}</option>
		                  <option value="ratingCount">{text.sortRatings}</option>
		                  <option value="printCount">{text.sortPrints}</option>
		                  <option value="timeAsc">{text.sortTime}</option>
		                  <option value="weightAsc">{text.sortMaterial}</option>
		                </select>
		              </div>
                  <p className="toolbar-help">{text.toolbarHelp}</p>
                  <div className="profile-badge-legend" aria-label={text.profileBadgeLegendAria}>
                    {getProfileBadgeLegend(isEnglish).map((badge) => (
                      <span key={badge.key} title={badge.title}>
                        <i className={cx('profile-badge', `profile-badge-${badge.tone}`)}>{badge.symbol}</i>
                        {badge.label}
                      </span>
                    ))}
                  </div>
		            </div>
		          )}

	          {projects.length === 0 ? (
            <div className="empty-state">
              <ClipboardList size={36} />
              <h3>{text.emptyProfilesTitle}</h3>
              <p>{text.emptyProfilesBody}</p>
            </div>
          ) : (
            <>
	              <div className="project-list">
	                {projects.map((project) => {
	                  const profile = getSelectedProfile(project)
	                  const sortedInstances = sortProfiles(project.instances, profileSort, targetPrinter)
	                  const isIncluded = plannedProjectIdSet.has(project.designId)
	                  const selectedPrinterCompatibility = getPrinterCompatibility(profile, targetPrinter, isEnglish)
                    const selectedProfileBadges = getProfileBadges(project, profile, isEnglish)
                    const selectionReason = getProfileSelectionReason(
                      project,
                      profile,
                      Boolean(manualProfileSelections[project.designId]),
                      isEnglish,
                    )
	                  return (
                    <article className={cx('project-row', !isIncluded && 'excluded')} key={project.designId}>
                      <div className="project-media">
                        <img src={profile.cover || project.coverUrl} alt="" />
                        <div className="project-actions">
                          <label className={cx('plan-toggle', isIncluded && 'active')}>
                            <input
                              type="checkbox"
                              checked={isIncluded}
                              onChange={() => toggleProjectIncluded(project.designId)}
                              aria-label={`${isIncluded ? text.removeFromPlan : text.includeInPlan} ${project.title}`}
                            />
                            <span>{isIncluded ? text.included : text.skipped}</span>
                          </label>
                          <span>{project.region.toUpperCase()}</span>
                          <a href={project.sourceUrl} target="_blank" rel="noreferrer">
                            <ExternalLink size={14} />
                            {text.open}
                          </a>
                        </div>
                      </div>
                      <div className="project-copy">
                        <div className="project-title-line">
                          <h3>{project.title}</h3>
                          <div className="project-weight">
                            <strong>{profile.weight}g</strong>
                            <span>{formatMinutes(profile.predictionSeconds)}</span>
                          </div>
                        </div>
                        <div className={cx('profile-picker', openProfilePickerId === project.designId && 'open')}>
                          <button
                            className="profile-picker-trigger"
                            type="button"
                            aria-expanded={openProfilePickerId === project.designId}
                            aria-label={`${project.title} profile`}
                            onClick={() =>
                              setOpenProfilePickerId((current) =>
                                current === project.designId ? null : project.designId,
                              )
                            }
                          >
                            {renderProfileBadgeSymbols(selectedProfileBadges)}
                            <span className="profile-picker-current">
                              <strong>{profile.title}</strong>
                              <small>{profileDetailsLabel(profile, isEnglish)}</small>
                            </span>
                            <i className="profile-picker-caret" aria-hidden="true" />
                          </button>
                          {openProfilePickerId === project.designId && (
                            <div className="profile-picker-menu" role="listbox" aria-label={`${project.title} profile`}>
                              {sortedInstances.map((instance) => {
                                const instanceBadges = getProfileBadges(project, instance, isEnglish)
                                const isSelectedProfile = instance.instanceId === profile.instanceId
                                return (
                                  <button
                                    className={cx('profile-picker-option', isSelectedProfile && 'selected')}
                                    key={instance.instanceId}
                                    type="button"
                                    role="option"
                                    aria-selected={isSelectedProfile}
                                    onClick={() => updateSelectedProfile(project.designId, instance.instanceId)}
                                  >
                                    {renderProfileBadgeSymbols(instanceBadges)}
                                    <span className="profile-picker-option-copy">
                                      <strong>{instance.title}</strong>
                                      <small>{profileDetailsLabel(instance, isEnglish)}</small>
                                    </span>
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                        <p className="profile-selection-reason">{selectionReason}</p>
                        <div className="profile-summary">
                          <div className="profile-meta">
                            {selectedProfileBadges.map((badge) => (
                              <span
                                className={cx('profile-badge', `profile-badge-${badge.tone}`)}
                                key={badge.key}
                                title={badge.title}
                                aria-label={badge.label}
                              >
                                {badge.symbol}
                              </span>
                            ))}
                            <span>{profile.printer || text.anyPrinter}</span>
                            {targetPrinter !== anyPrinter && (
                              <span
                                className={cx(
                                  selectedPrinterCompatibility.rank > 0 ? 'printer-match' : 'printer-mismatch',
                                  selectedPrinterCompatibility.level === 'compatible' && 'printer-compatible-chip',
                                )}
                                title={selectedPrinterCompatibility.detail}
                              >
                                {selectedPrinterCompatibility.label}
                              </span>
                            )}
                            <span>{profile.layerHeight || '-'}mm</span>
                            <span>{profile.infill || '-'} {text.fill}</span>
                            <span>{profile.needAms ? text.needsAms : text.noAms}</span>
                          </div>
                          <div className="filament-strip" aria-label={`${project.title} ${text.colorsAria}`}>
                            {profile.filaments.map((filament) => (
                              <button
                                key={filamentKey(filament)}
                                className={focusedColorKey === filamentKey(filament) ? 'focused' : ''}
                                type="button"
                                title={isEnglish ? `View ${filament.color} in color matrix` : `在颜色矩阵中查看 ${filament.color}`}
                                onClick={() => focusColor(filamentKey(filament))}
                              >
                                <i style={{ backgroundColor: filament.color }} />
                                {filament.usedG}g
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="profile-rail" aria-label={`${project.title} ${text.profileComparisonAria}`}>
	                          {sortedInstances.map((instance) => {
                              const printerCompatibility = getPrinterCompatibility(instance, targetPrinter, isEnglish)
                              const profileBadges = getProfileBadges(project, instance, isEnglish)
                              return (
	                              <button
                                  key={instance.instanceId}
                                  className={cx(
                                    instance.instanceId === profile.instanceId && 'selected',
                                    targetPrinter !== anyPrinter &&
                                      (printerCompatibility.rank > 0 ? 'printer-compatible' : 'printer-unmatched'),
                                    targetPrinter !== anyPrinter &&
                                      printerCompatibility.level === 'exact' &&
                                      'printer-exact',
                                  )}
                                  type="button"
                                  onClick={() => updateSelectedProfile(project.designId, instance.instanceId)}
                                >
                                  {profileBadges.length > 0 && (
                                    <span className="profile-card-badges">
                                      {profileBadges.map((badge) => (
                                        <span
                                          className={cx('profile-badge', `profile-badge-${badge.tone}`)}
                                          key={badge.key}
                                          title={badge.title}
                                          aria-label={badge.label}
                                        >
                                          {badge.symbol}
                                        </span>
                                      ))}
                                    </span>
                                  )}
                                  <strong>{instance.title}</strong>
                                  <span>{instance.printer || text.anyPrinter}</span>
                                  {targetPrinter !== anyPrinter && printerCompatibility.rank > 0 && (
                                    <span className="match-chip" title={printerCompatibility.detail}>
                                      {printerCompatibility.label}
                                    </span>
                                  )}
                                  <span>{formatMinutes(instance.predictionSeconds)}</span>
                                  <span>{isEnglish ? `${instance.plateCount} plates` : `${instance.plateCount} 盘`}</span>
                                  <span>{formatRating(instance, isEnglish)}</span>
                                  <span>{isEnglish ? `${formatCount(instance.downloadCount)} downloads` : `${formatCount(instance.downloadCount)} 下载`}</span>
                                </button>
                              )
                            })}
                        </div>
                        <div className="profile-signals" aria-label={`${project.title} ${text.profileMetricsAria}`}>
                          <span>
                            {text.estimatedTime}
                            <strong>{formatMinutes(profile.predictionSeconds)}</strong>
                          </span>
                          <span>
                            {text.plateCount}
                            <strong>{profile.plateCount}</strong>
                          </span>
                          <span>
                            {text.rating}
                            <strong>{formatRating(profile, isEnglish)}</strong>
                          </span>
                          <span>
                            {text.downloads}
                            <strong>{formatCount(profile.downloadCount)}</strong>
                          </span>
                          <span>
                            {text.prints}
                            <strong>{formatCount(profile.printCount)}</strong>
                          </span>
                        </div>
                      </div>
                    </article>
                  )
	                })}
	              </div>
	              <div className="step-footer profile-step-footer">
	                <button type="button" onClick={() => setActiveStep('matrix')}>
	                  {text.continueMatrix}
	                </button>
	              </div>
	
	              <div className="matrix-section">
                <div className="matrix-heading">
                  <div>
                    <p className="section-kicker">{text.matrixKicker}</p>
                    <h2>{text.matrixTitle}</h2>
                  </div>
                  <span>
                    <Table2 size={16} />
                    {text.projectsUnit(plannedProjectCount)} · {text.colorsCount}
                  </span>
                </div>
                {plannedProjectCount === 0 ? (
                  <div className="empty-state compact-empty">
                    <ClipboardList size={30} />
                    <h3>{text.noIncludedTitle}</h3>
                    <p>{text.noIncludedBody}</p>
                  </div>
                ) : (
                <div className="matrix-wrap">
                  <table className="color-matrix">
                    <thead>
                      <tr>
		                        <th className="matrix-project-col">{text.project}</th>
		                        {orderedSummary.map((row) => {
		                          const decision = getMappingDecision(row, purchaseMappings[row.key], isEnglish)
		                          const autoDecision = getMappingDecision(row, undefined, isEnglish)
		                          const selectedItem = decision.item
		                          return (
		                            <th
		                              key={row.key}
		                              className={cx(
		                                rawSelectionSource === 'matrix' &&
                                      focusedColorKey === row.key &&
                                      selectedRawKeys.includes(row.key) &&
                                      'focused-color',
		                                rawSelectionSource === 'matrix' && selectedRawKeys.includes(row.key) && 'selected-color',
		                              )}
		                              onClick={() => toggleColorSelection(row.key, 'matrix', 'matrix')}
                                  onMouseDown={(event) => event.preventDefault()}
		                              onKeyDown={(event) => handleColorKey(event, row.key, 'matrix')}
		                              role="button"
		                              tabIndex={0}
		                              aria-label={isEnglish ? `View ${row.type} ${row.color} color column` : `查看 ${row.type} ${row.color} 颜色列`}
		                            >
		                              <div className="matrix-color-head">
		                                <div className="map-color-pair">
		                                  <span
		                                    style={{ backgroundColor: row.color }}
                                    title={isEnglish ? `Original color ${row.color}` : `原始颜色 ${row.color}`}
		                                  />
                                  <i />
                                  <span
                                    style={{ backgroundColor: selectedItem.hex }}
                                    title={isEnglish ? `Purchase color ${selectedItem.hex}` : `购买颜色 ${selectedItem.hex}`}
                                  />
	                                </div>
			                                <strong>{colorNames[row.color] || row.color}</strong>
			                                <small>{text.total} {row.usedG}g</small>
                                      <small>
                                        {selectedItem.line} {selectedItem.colorName}
                                      </small>
			                                <em
                                        className={getMappingRiskClass(decision.confidence)}
			                                  title={
                                      isEnglish
                                        ? `${decision.detail} Auto target: ${autoDecision.item.line} ${autoDecision.item.colorName}`
                                        : `${decision.detail} 自动目标: ${autoDecision.item.line} ${autoDecision.item.colorName}`
                                    }
		                                >
			                                  {getMappingConfidenceLabel(decision.confidence, isEnglish)}
			                                </em>
                              </div>
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody>
	                      {matrixRows.map(({ project, profile, byColor }) => (
	                        <tr key={project.designId}>
	                          <th className="matrix-project-col">
	                            <label className="matrix-project-plan">
	                              <input
	                                type="checkbox"
	                                checked={plannedProjectIdSet.has(project.designId)}
	                                onChange={() => toggleProjectIncluded(project.designId)}
	                                aria-label={`${text.removeFromPlan} ${project.title}`}
	                              />
	                              <span>
	                                <strong>{project.title}</strong>
	                                <small>{profile.title}</small>
	                              </span>
	                            </label>
	                          </th>
                          {orderedSummary.map((row) => {
                            const grams = byColor.get(row.key) || 0
                            return (
	                              <td
	                                key={`${project.designId}-${row.key}`}
	                                className={cx(
	                                  grams > 0 && 'has-usage',
	                                  rawSelectionSource === 'matrix' &&
                                      focusedColorKey === row.key &&
                                      selectedRawKeys.includes(row.key) &&
                                      'focused-color',
	                                  rawSelectionSource === 'matrix' && selectedRawKeys.includes(row.key) && 'selected-color',
	                                )}
	                                onClick={grams > 0 ? () => toggleColorSelection(row.key, 'matrix', 'matrix') : undefined}
                                  onMouseDown={grams > 0 ? (event) => event.preventDefault() : undefined}
	                                onKeyDown={grams > 0 ? (event) => handleColorKey(event, row.key, 'matrix') : undefined}
	                                role={grams > 0 ? 'button' : undefined}
	                                tabIndex={grams > 0 ? 0 : undefined}
	                                aria-label={
		                                  grams > 0
		                                    ? isEnglish
                                          ? `View ${row.type} ${row.color}; ${project.title} uses ${grams}g`
                                          : `查看 ${row.type} ${row.color}，${project.title} 使用 ${grams}g`
	                                    : undefined
	                                }
	                              >
                                {grams > 0 ? `${grams}g` : ''}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
		                  </table>
		                </div>
                )}
		                <div className="mapping-section">
		                  <div className="summary-subhead">
		                    <h3>{text.purchaseMappingTitle}</h3>
		                    <span>{text.mappingSubtitle}</span>
		                  </div>
                      <div className="mapping-legend" aria-label={text.mappingLegendAria}>
                        <span className="risk-ok">{text.riskOk}</span>
                        <span className="risk-warning">{text.riskWarning}</span>
                        <span className="risk-danger">{text.riskDanger}</span>
                      </div>
                      <p className="mapping-help">{text.mappingHelp}</p>
                      {selectedRawRows.length > 0 && (
                        <div className="merge-action-bar">
                          <strong>{text.selectedRawColors(selectedRawRows.length, selectedRawTotalG)}</strong>
                          {hasMixedSelectedMaterials ? (
                            <p>{text.mixedMaterialSelection}</p>
                          ) : (
                            <div className="color-combobox" onBlur={closeBatchColorMenuOnBlur}>
                              <span>{text.batchMappingTarget}</span>
                              <button
                                type="button"
                                className="color-combobox-trigger"
                                onClick={() => setIsBatchColorMenuOpen((current) => !current)}
                                aria-expanded={isBatchColorMenuOpen}
                                aria-haspopup="listbox"
                                aria-label={text.batchMappingTarget}
                              >
                                {selectedBatchMappingItem && (
                                  <>
                                    <i style={{ backgroundColor: selectedBatchMappingItem.hex }} />
                                    <span className="color-combobox-copy">
                                      <span className="color-combobox-name">
                                        {selectedBatchMappingItem.line} {selectedBatchMappingItem.colorName}
                                      </span>
                                      <span className="color-combobox-sku"> · {selectedBatchMappingItem.sku || selectedBatchMappingItem.id}</span>
                                    </span>
                                  </>
                                )}
                              </button>
                              {isBatchColorMenuOpen && (
                                <div className="color-combobox-menu" role="listbox" aria-label={text.batchMappingTarget}>
                                  {selectedTargetOptions.map((item) => (
                                    <button
                                      type="button"
                                      role="option"
                                      aria-selected={item.id === batchMappingItemId}
                                      className={cx('color-combobox-option', item.id === batchMappingItemId && 'active')}
                                      key={item.id}
                                      onClick={() => {
                                        setBatchMappingItemId(item.id)
                                        setIsBatchColorMenuOpen(false)
                                      }}
                                    >
                                      <i style={{ backgroundColor: item.hex }} />
                                      <span className="color-combobox-copy">
                                        <span className="color-combobox-name">
                                          {item.line} {item.colorName}
                                        </span>
                                        <span className="color-combobox-sku"> · {item.sku || item.id}</span>
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                          <button type="button" onClick={applyBatchMapping} disabled={hasMixedSelectedMaterials}>
                            {text.mergeToPurchaseColor}
                          </button>
                          <button type="button" onClick={restoreSelectedMappings}>
                            <RotateCcw size={14} />
                            {text.restoreSelected}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
	                              clearRawSelection()
	                              setFocusedColorKey(null)
	                            }}
                          >
                            {text.clearSelection}
                          </button>
                        </div>
                      )}
		                  <div className="purchase-color-groups">
		                    {purchaseRows.map((row) => {
                          const groupKeys = row.rawRows.map((rawRow) => rawRow.key)
                          const selectedCount =
                            rawSelectionSource === 'mapping' ? groupKeys.filter((key) => selectedRawKeys.includes(key)).length : 0
                          return (
                          <article
                            className={cx(
                              'purchase-color-group',
                              selectedCount > 0 && 'has-selection',
                              selectedCount === groupKeys.length && 'selected-color',
                            )}
                            key={`mapping-${row.item.id}`}
                            onClick={() => toggleRawColorGroup(row.rawRows, 'matrix')}
                            onKeyDown={(event) => handleRawColorGroupKey(event, row.rawRows)}
                            role="button"
                            tabIndex={0}
                            aria-pressed={selectedCount === groupKeys.length}
                            aria-label={
                              isEnglish
                                ? `Select purchase group ${row.item.line} ${row.item.colorName}`
                                : `选择购买颜色分组 ${row.item.line} ${row.item.colorName}`
                            }
                          >
                            <div className="purchase-color-group-head">
                              <span className="swatch" style={{ backgroundColor: row.item.hex }} />
                              <div>
                                <strong>
                                  {row.item.brand} {row.item.line} {row.item.colorName}
                                </strong>
                                <small>
                                  {row.item.sku || row.item.id} · {text.total} {row.usedG}g ·{' '}
                                  {row.spools > 0 ? formatRolls(row.spools, isEnglish) : text.projectsUnit(row.rawRows.length)}
                                  {selectedCount > 0 ? ` · ${selectedCount}/${groupKeys.length}` : ''}
                                </small>
                              </div>
                            </div>
                            <div className="raw-chip-list" aria-label={text.includedRawColors}>
                              {row.rawRows.map((rawRow) => {
                                const decision = getMappingDecision(rawRow, purchaseMappings[rawRow.key], isEnglish)
                                return (
                                  <button
                                    type="button"
                                    className={cx(
                                      'raw-chip',
                                      rawSelectionSource === 'mapping' &&
                                        focusedColorKey === rawRow.key &&
                                        selectedRawKeys.includes(rawRow.key) &&
                                        'focused-color',
                                      rawSelectionSource === 'mapping' && selectedRawKeys.includes(rawRow.key) && 'selected-color',
                                    )}
                                    key={`${row.item.id}-${rawRow.key}`}
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      toggleColorSelection(rawRow.key, 'mapping', 'matrix')
                                    }}
                                    onKeyDown={(event) => {
                                      event.stopPropagation()
                                      handleColorKey(event, rawRow.key, 'mapping')
                                    }}
                                    aria-pressed={rawSelectionSource === 'mapping' && selectedRawKeys.includes(rawRow.key)}
                                    title={decision.detail}
                                  >
                                    <span style={{ backgroundColor: rawRow.color }} />
                                    <strong>
                                      {rawRow.type} {colorNames[rawRow.color] || rawRow.color}
                                    </strong>
                                    <small>{rawRow.usedG}g</small>
                                  </button>
                                )
                              })}
                            </div>
                          </article>
                          )
                        })}
		                  </div>
		                </div>
		                <div className="step-footer">
		                  <button type="button" onClick={() => setActiveStep('purchase')}>
		                    {text.continuePurchase}
	                  </button>
	                </div>
	              </div>
            </>
          )}
        </section>

	        <aside
	          className={cx('summary-panel', 'flow-panel', activeStep === 'purchase' && 'active')}
	          aria-label={text.shoppingSummaryAria}
	        >
	          <div className="panel-heading">
	            <div>
	              <p className="section-kicker">{text.purchasePlan}</p>
	              <h2>{text.purchaseSummary}</h2>
	            </div>
	            <ShoppingCart size={20} />
	          </div>
            <div className="purchase-layout">
              <div className="purchase-sidebar">
            <div className="purchase-reminder">
              <strong>{text.purchaseReminder}</strong>
              <span>{text.reminderStore}</span>
              <span>{text.reminderStock}</span>
              <span>{text.reminderWaste}</span>
              <span>{text.reminderMapping}</span>
            </div>

	          <div className="settings purchase-settings">
	            <div className="panel-heading compact">
	              <div>
	                <p className="section-kicker">{text.purchaseRules}</p>
	                <h2>{text.buyingRules}</h2>
	              </div>
	              <SlidersHorizontal size={18} />
	            </div>
	            <label className="setting-with-help">
	              <span>{text.buffer}</span>
	              <input
	                type="text"
	                inputMode="decimal"
	                value={bufferPctInput}
	                onBlur={commitBufferPctInput}
	                onChange={(event) => setBufferPctInput(normalizeNumberDraft(event.target.value))}
	                onKeyDown={(event) => commitRuleInputOnEnter(event, commitBufferPctInput)}
	                aria-label={text.bufferAria}
	              />
	              <strong>%</strong>
	              <small>{text.bufferHelp}</small>
	            </label>
	            <label className="setting-with-help">
	              <span>{text.amsBuffer}</span>
	              <input
	                type="text"
	                inputMode="decimal"
	                value={amsBufferPctInput}
	                onBlur={commitAmsBufferPctInput}
	                onChange={(event) => setAmsBufferPctInput(normalizeNumberDraft(event.target.value))}
	                onKeyDown={(event) => commitRuleInputOnEnter(event, commitAmsBufferPctInput)}
	                aria-label={text.amsBufferAria}
	              />
	              <strong>%</strong>
	              <small>{text.amsBufferHelp}</small>
	            </label>
	            <label className="setting-with-help">
	              <span>{text.spoolWeight}</span>
	              <input
	                type="text"
	                inputMode="numeric"
	                value={spoolSizeInput}
	                onBlur={commitSpoolSizeInput}
	                onChange={(event) => setSpoolSizeInput(normalizeNumberDraft(event.target.value))}
	                onKeyDown={(event) => commitRuleInputOnEnter(event, commitSpoolSizeInput)}
	                aria-label={text.spoolWeightAria}
	              />
	              <strong>g</strong>
	              <small>{text.spoolWeightHelp}</small>
	            </label>
	          </div>
	
	          <div className="summary-metrics">
            <div>
              <span>{text.rawTotal}</span>
              <strong>{Math.round(totalWeight)}g</strong>
            </div>
            <div>
              <span>{text.amsAffected}</span>
              <strong>{Math.round(totalAmsAffectedWeight)}g</strong>
            </div>
            <div>
              <span>{text.bufferedTotal}</span>
              <strong>{totalRequiredWithBuffer}g</strong>
            </div>
	            <div>
	              <span>{text.needToBuy}</span>
	              <strong>{formatRolls(totalSpools, isEnglish)}</strong>
	            </div>
          </div>

	          {projects.length > 0 && (
              <div className="purchase-scope-block">
                <div className="summary-subhead compact-subhead">
                  <h3>{text.purchaseScope}</h3>
                  <span>{text.includedCount}</span>
                </div>
	            <div className="purchase-project-strip" aria-label={text.purchaseProjectFilterAria}>
	              {projects.map((project) => {
	                const profile = getSelectedProfile(project)
	                const isIncluded = plannedProjectIdSet.has(project.designId)
	                return (
	                  <label
	                    className={cx('purchase-project-chip', isIncluded && 'active')}
	                    key={`purchase-project-${project.designId}`}
	                  >
	                    <input
	                      type="checkbox"
	                      checked={isIncluded}
	                      onChange={() => toggleProjectIncluded(project.designId)}
	                      aria-label={`${isIncluded ? text.removeFromPurchase : text.includeInPurchase} ${project.title}`}
	                    />
	                    <span>
                        <em>{getProjectNumber(project.designId) || ''}</em>
	                      <strong>{project.title}</strong>
	                      <small>
	                        {profile.weight}g · {profile.printer || text.anyPrinter}
	                      </small>
	                    </span>
	                  </label>
	                )
	              })}
	            </div>
              </div>
	          )}

              </div>
              <div className="purchase-results">
	          <div className="summary-subhead purchase-heading">
            <h3>{text.purchaseList}</h3>
            <span>{text.purchaseSubhead}</span>
          </div>
            {purchaseRows.length === 0 ? (
              <div className="empty-state compact-empty">
                <ClipboardList size={30} />
                <h3>{text.emptyPurchaseTitle}</h3>
                <p>{text.emptyPurchaseBody}</p>
              </div>
            ) : (
              <>
                  <div className="purchase-table-tools">
                    <div className="purchase-table-tool-group">
                      <button type="button" onClick={() => setExpandedPurchaseRowIds(purchaseRows.map((row) => row.item.id))}>
                        {text.expandAll}
                      </button>
                      <button type="button" onClick={() => setExpandedPurchaseRowIds([])}>
                        {text.collapseAll}
                      </button>
                    </div>
                    <div className="purchase-table-tool-group purchase-table-export-tools">
                      <button type="button" onClick={copyShoppingList}>
                        <Copy size={15} />
                        {copyState === 'copied' ? text.copied : text.copyList}
                      </button>
                      <button type="button" onClick={exportCsv}>
                        <Download size={15} />
                        {text.exportCsv}
                      </button>
                    </div>
                  </div>
                  <div className="purchase-table-wrap">
                    <table className="purchase-table">
                      <colgroup>
                        <col className="purchase-col-toggle" />
                        <col className="purchase-col-item" />
                        <col className="purchase-col-rawg" />
                        <col className="purchase-col-buffer" />
                        <col className="purchase-col-buffer" />
                        <col className="purchase-col-required" />
                        <col className="purchase-col-stock" />
                        <col className="purchase-col-rolls" />
                        <col className="purchase-col-raw" />
                        <col className="purchase-col-link" />
                      </colgroup>
                      <thead>
                        <tr>
                          <th aria-label={text.projectDetails}>{text.detailColumn}</th>
                          <th>{text.purchaseList}</th>
                          <th>{text.original}</th>
                          <th>{text.baseBufferG}</th>
                          <th>{text.amsExtraBufferG}</th>
                          <th>{text.finalRequired}</th>
                          <th>{text.stockDeduction}</th>
                          <th>{text.needToBuy}</th>
                          <th>{text.rawUsage}</th>
                          <th>{text.purchaseAction}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchaseRows.map((row) => {
                          const rowCartUrl = buildCartUrl(row.item, row.spools)
                          const projectDetails = getPurchaseProjectColorDetailRows(row)
                          const detailsExpanded = expandedPurchaseRowIds.includes(row.item.id)
                          return (
                            <Fragment key={`table-${row.item.id}`}>
                              <tr>
                                <td>
                                  <button
                                    type="button"
                                    className="table-row-toggle"
                                    onClick={() => togglePurchaseRowDetails(row.item.id)}
                                    aria-expanded={detailsExpanded}
                                    aria-label={detailsExpanded ? text.collapseProjectDetails : text.expandProjectDetails(projectDetails.length)}
                                  >
                                    <span>{detailsExpanded ? '−' : '+'}</span>
                                  </button>
                                </td>
                                <td>
                                  <span className="table-color-name">
                                    <i style={{ backgroundColor: row.item.hex }} />
                                    <strong>
                                      {row.item.line} {row.item.colorName}
                                    </strong>
                                    <small>{row.item.sku || row.item.id}</small>
                                  </span>
                                </td>
                                <td>{row.usedG}g</td>
                                <td>{row.baseBufferG}g</td>
                                <td>{row.amsExtraBufferG}g</td>
                                <td>{row.requiredWithBuffer}g</td>
                                <td>
                                  <label className="table-stock">
                                    <input
                                      type="number"
                                      min="0"
                                      value={row.ownedRolls || ''}
                                      placeholder={text.stockPlaceholder}
                                      onChange={(event) =>
                                        setInventory((current) => ({
                                          ...current,
                                          [row.item.id]: { rolls: event.target.value === '' ? 0 : Number(event.target.value) },
                                        }))
                                      }
                                      aria-label={
                                        isEnglish
                                          ? `${row.item.material} ${row.item.colorName} owned stock rolls`
                                          : `${row.item.material} ${row.item.colorName} 已有库存卷数`
                                      }
                                      step="0.1"
                                    />
                                    <span>{text.rollUnit}</span>
                                  </label>
                                </td>
                                <td className="table-buy-count">
                                  <strong>{formatRolls(row.spools, isEnglish)}</strong>
                                </td>
                                <td>{getRawColorSummary(row)}</td>
                                <td>
                                  <a className="table-link-action" href={rowCartUrl} target="_blank" rel="noreferrer">
                                    {text.openBuyRolls()}
                                  </a>
                                </td>
                              </tr>
                              {detailsExpanded &&
                                projectDetails.map((detail) => (
                                  <tr className="purchase-detail-line" key={`${row.item.id}-${detail.projectNumber}`}>
                                    <td className="purchase-detail-gutter" aria-hidden="true"></td>
                                    <td>
                                      <span className="purchase-detail-project" title={detail.projectTitle}>
                                        <strong>
                                          {text.projectPrefix} {detail.projectNumber} · {detail.projectTitle}
                                        </strong>
                                      </span>
                                    </td>
                                    <td>{detail.usedG}g</td>
                                    <td>{detail.baseBufferG}g</td>
                                    <td>{detail.amsExtraBufferG}g</td>
                                    <td>{detail.requiredWithBuffer}g</td>
                                    <td className="table-muted">-</td>
                                    <td className="table-muted">-</td>
                                    <td>{detail.colors.join(isEnglish ? '; ' : '；')}</td>
                                    <td className="purchase-detail-action" aria-hidden="true"></td>
                                  </tr>
                                ))}
                            </Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
              </>
            )}
              </div>
            </div>
        </aside>
      </section>
    </main>
  )
}

export default App
