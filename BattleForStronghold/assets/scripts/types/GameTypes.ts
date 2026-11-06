/** 据点阵营。只有玩家阵营可以作为派遣来源。 */
export enum Faction {
    /** 己方。 */
    Player = 'Player',
    /** 对手。 */
    Enemy = 'Enemy',
    /** 中立。 */
    Neutral = 'Neutral',
}

/** 整局阶段。行军和交战同时只能存在一支队伍。 */
export enum GamePhase {
    /** 尚未选择来源。 */
    Idle = 'Idle',
    /** 已选择来源，可以改目标或派遣。 */
    SourceSelected = 'SourceSelected',
    /** 队伍正在沿路径移动。 */
    Marching = 'Marching',
    /** 队伍已到达，正在结算兵力。 */
    Battling = 'Battling',
}

/** 三个据点的固定 ID，必须与只读配置一致。 */
export type StrongholdId = 'player_base' | 'neutral_pass' | 'enemy_fort';

/** Canvas 本地坐标。x 向右，y 向上，原点在画布中心。 */
export interface Vec2 {
    readonly x: number;
    readonly y: number;
}

/**
 * 据点初始配置。
 * 运行时改兵力或阵营前必须先深拷贝，禁止回写这里的对象。
 */
export interface StrongholdConfig {
    readonly id: StrongholdId;
    readonly name: string;
    readonly faction: Faction;
    /** 初始兵力。 */
    readonly troops: number;
    readonly position: Vec2;
    /** 色块颜色，格式 #RRGGBB。 */
    readonly color: string;
}

/**
 * 一对据点共用的路径中间点。
 * 去程和返程使用同一点，只反转起点和终点的顺序。
 */
export interface RouteMidpointConfig {
    readonly a: StrongholdId;
    readonly b: StrongholdId;
    readonly midpoint: Vec2;
}
