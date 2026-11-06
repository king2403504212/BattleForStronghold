import { Faction, RouteMidpointConfig, StrongholdConfig, StrongholdId, Vec2 } from '../types/GameTypes';

/** 背景色。 */
export const BG_COLOR = '#6FA85A';

/** 右侧面板中心、尺寸和底色。左边缘为 464 - 160 = 304。 */
export const PANEL_POSITION: Vec2 = { x: 464, y: 0 };
export const PANEL_SIZE = { width: 320, height: 640 };
export const PANEL_BG_COLOR = '#1B2430';
/** 面板底色不透明度，92%。 */
export const PANEL_BG_ALPHA = 0.92;

/** 据点点击区域与色块尺寸，单位为像素。 */
export const STRONGHOLD_HIT_SIZE = { width: 160, height: 180 };
export const STRONGHOLD_BODY_SIZE = { width: 120, height: 100 };

/** 名称、阵营、兵力相对据点中心的纵向偏移和字号。 */
export const NAME_OFFSET_Y = 78;
export const NAME_FONT_SIZE = 24;
export const FACTION_OFFSET_Y = 52;
export const FACTION_FONT_SIZE = 18;
export const TROOP_OFFSET_Y = -72;
export const TROOP_FONT_SIZE = 20;

/** 路线线宽，以及白色路线的不透明度 30%。 */
export const ROUTE_LINE_WIDTH = 4;
export const ROUTE_LINE_ALPHA = 0.3;

/** 未指定来源时的默认派遣数量。实际填入值是 min(该值, 来源当前兵力)。 */
export const DEFAULT_DISPATCH_AMOUNT = 20;
/** 输入框最多保留的位数。 */
export const DISPATCH_INPUT_MAX_LENGTH = 6;

/** 沿折线移动的速度，单位是设计像素/秒。 */
export const MOVE_SPEED = 200;

/** 战斗每跳间隔（秒）。第一跳必须再延迟同样的 0.5 秒。 */
export const BATTLE_INTERVAL = 0.5;
/** 每一跳双方各自扣除的兵力。不足时只扣剩余值。 */
export const BATTLE_DAMAGE = 5;
/** 一次征兵最多补充的兵力，也是对应消耗的军粮。实际补充量不超过剩余上限和现有军粮。 */
export const RECRUIT_AMOUNT = 20;

/** 每座城的兵力上限。征兵不能超过这里。 */
export const TROOP_CAP: Readonly<Record<StrongholdId, number>> = {
    player_base: 100,
    neutral_pass: 60,
    silver_city: 100,
    enemy_fort: 100,
};

/** 非玩家城池第一次被占领时立即获得的军粮。家园不会被占领，因此为 0。 */
export const FIRST_CAPTURE_GRAIN: Readonly<Record<StrongholdId, number>> = {
    player_base: 0,
    neutral_pass: 40,
    silver_city: 60,
    enemy_fort: 80,
};

/** 顶部提示停留时间（秒）。新提示直接替换旧提示。 */
export const TOAST_DURATION = 1.5;
/** 飘字上移距离和存在时间。 */
export const FLOAT_DISTANCE = 40;
export const FLOAT_DURATION = 0.4;
/** 守军飘字相对目标中心的偏移。 */
export const DEFENDER_FLOAT_OFFSET: Vec2 = { x: 30, y: 40 };
/** 攻方飘字相对目标中心的偏移。 */
export const ATTACKER_FLOAT_OFFSET: Vec2 = { x: -30, y: 40 };

/** 来源圈颜色。透明度在 255 和 120 之间循环，单程 0.6 秒。 */
export const SOURCE_RING_COLOR = '#2EE0FF';
export const SOURCE_RING_ALPHA_HIGH = 255;
export const SOURCE_RING_ALPHA_LOW = 120;
export const SOURCE_RING_HALF_DURATION = 0.6;
/** 目标圈颜色，静止显示。 */
export const TARGET_RING_COLOR = '#FFE14A';

/** 重新开始按钮的颜色，需和派遣按钮区分开。 */
export const RESTART_BUTTON_COLOR = '#3D4F66';

/** 空闲态点按缩放的目标值和时长。 */
export const PRESS_SCALE = 0.94;
export const PRESS_DURATION = 0.12;
/** 行军或交战中，最后点中的据点保持的缩放和过渡时长。 */
export const FOCUS_SCALE = 1.1;
export const FOCUS_DURATION = 0.12;
/** 焦点光晕：与据点阵营同色，不透明度 0–255，每边比色块大 16 像素。 */
export const FOCUS_GLOW_ALPHA = 180;
export const FOCUS_GLOW_PADDING = 16;

/** 阵营在界面上的固定写法。 */
export const FACTION_LABEL: Readonly<Record<Faction, string>> = {
    [Faction.Player]: '玩家',
    [Faction.Enemy]: '对手',
    [Faction.Neutral]: '中立',
};

/** 玩家可见文案。调用处不要改写这些句子。 */
export const GameText = {
    title: '据点争夺',
    unselected: '未选择',
    troopPrefix: '兵力',
    marching: '行军中',
    battling: '交战中',
    allCaptured: '已控制全部据点',
    noTroops: '已无可用兵力',
    armyBusy: '已有队伍在行动',
    selectSourceFirst: '请先选择己方据点',
    notEnoughTroops: '兵力不足',
    selectTarget: '请选择目标据点',
    invalidTarget: '目标无效',
    invalidAmount: '请输入有效兵力',
    onlyFromPlayer: '只能从己方据点出兵',
    captureSuccess: '占领成功',
    attackFail: '进攻失败',
    troopsFull: '兵力已满',
    notEnoughGrain: '军粮不足',
} as const;

/**
 * 据点初始兵力、阵营和名称。
 * 只读。开局和重开都要深拷贝后再使用。
 * 画面位置以 game.scene 里的城节点为准，不要用这里的 position 摆城或画线。
 */
export const STRONGHOLDS: readonly StrongholdConfig[] = [
    { id: 'player_base', name: '家园', faction: Faction.Player, troops: 100, position: { x: -250, y: -68 }, color: '#2F6BFF' },
    { id: 'neutral_pass', name: '金城', faction: Faction.Neutral, troops: 40, position: { x: -137, y: 79 }, color: '#E0B000' },
    { id: 'silver_city', name: '银城', faction: Faction.Enemy, troops: 80, position: { x: 86, y: 80 }, color: '#C9D0D8' },
    { id: 'enemy_fort', name: '龙城', faction: Faction.Enemy, troops: 80, position: { x: 224, y: -49 }, color: '#E23B3B' },
];

/** 旧布局的中间点。当前场景没有路线节点，运行时不要用它画线。 */
export const ROUTE_MIDPOINTS: readonly RouteMidpointConfig[] = [
    { a: 'player_base', b: 'neutral_pass', midpoint: { x: -230, y: -50 } },
    { a: 'player_base', b: 'enemy_fort', midpoint: { x: -120, y: 170 } },
    { a: 'neutral_pass', b: 'enemy_fort', midpoint: { x: 70, y: -40 } },
];

/**
 * 按无序据点对查找旧布局中间点。
 * 当前场景没有路线节点，运行时不要调用，也不要据此补直线或画线。
 */
export function getRouteMidpoint(from: StrongholdId, to: StrongholdId): Vec2 | null {
    const route = ROUTE_MIDPOINTS.find((item) =>
        (item.a === from && item.b === to) || (item.a === to && item.b === from),
    );
    return route ? route.midpoint : null;
}
