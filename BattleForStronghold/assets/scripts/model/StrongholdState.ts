import { STRONGHOLDS, GameText } from '../config/GameConfig';
import { Faction, GamePhase, StrongholdId, Vec2 } from '../types/GameTypes';

/** 可修改的据点。由初始配置深拷贝而来，改它不会写回配置。 */
export interface StrongholdState {
    id: StrongholdId;
    name: string;
    faction: Faction;
    /** 当前兵力。派遣扣的是这份拷贝。 */
    troops: number;
    /** 坐标拷贝。逻辑不改位置。 */
    position: Vec2;
    /** 与当前阵营对应的色块颜色，#RRGGBB。 */
    color: string;
}

/** 已经派出、尚未结算完的一支队伍。 */
export interface ArmyOrder {
    sourceId: StrongholdId;
    targetId: StrongholdId;
    /** 攻方剩余兵力。到达后每跳从这里扣。 */
    troops: number;
}

/**
 * 一局的运行时数据。
 * 重开时整体换成 createSession() 的新对象，不要逐项改回配置。
 */
export interface GameSession {
    phase: GamePhase;
    strongholds: StrongholdState[];
    sourceId: StrongholdId | null;
    targetId: StrongholdId | null;
    /** 派遣输入框原文。空字符串表示未填写。 */
    dispatchText: string;
    /**
     * 同一次成功派遣尚未结束时为 true。
     * 为 true 时后到的派遣点击直接丢弃，不再扣兵，也不再提示。
     */
    dispatchLock: boolean;
    /** 没有在途队伍时为 null。 */
    army: ArmyOrder | null;
    /**
     * 行军或交战中最后点中的据点。
     * 只表示视觉焦点，不替代 sourceId 和 targetId。
     */
    focusId: StrongholdId | null;
}

/** 从只读配置做出一局初始状态。配置对象本身不会被改到。 */
export function createSession(): GameSession {
    return {
        phase: GamePhase.Idle,
        strongholds: STRONGHOLDS.map((item) => ({
            id: item.id,
            name: item.name,
            faction: item.faction,
            troops: item.troops,
            position: { x: item.position.x, y: item.position.y },
            color: item.color,
        })),
        sourceId: null,
        targetId: null,
        dispatchText: '',
        dispatchLock: false,
        army: null,
        focusId: null,
    };
}

/** 按 ID 查找运行时据点。找不到说明调用方传入了配置外的 ID。 */
export function findStronghold(session: GameSession, id: StrongholdId): StrongholdState | null {
    const found = session.strongholds.find((item) => item.id === id);
    return found ?? null;
}

/**
 * 队伍结算结束后清空来源、目标和输入，并去掉队伍。
 * 不恢复本次已扣除的兵力。
 */
export function finishArmy(session: GameSession): void {
    session.sourceId = null;
    session.targetId = null;
    session.dispatchText = '';
    session.dispatchLock = false;
    session.army = null;
    session.focusId = null;
    session.phase = GamePhase.Idle;
}

/** 状态行文案。没有需要常驻显示的内容时返回空字符串。 */
export function getStatusText(session: GameSession): string {
    if (session.phase === GamePhase.Marching) {
        return GameText.marching;
    }
    if (session.phase === GamePhase.Battling) {
        return GameText.battling;
    }
    const ownsAll = session.strongholds.every((item) => item.faction === Faction.Player);
    if (ownsAll) {
        return GameText.allCaptured;
    }
    const playerTroops = session.strongholds
        .filter((item) => item.faction === Faction.Player)
        .reduce((sum, item) => sum + item.troops, 0);
    if (playerTroops === 0 && session.army === null) {
        return GameText.noTroops;
    }
    return '';
}
