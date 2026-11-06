import { BATTLE_DAMAGE, GameText, STRONGHOLDS } from '../config/GameConfig';
import { findStronghold, finishArmy, GameSession } from '../model/StrongholdState';
import { Faction, GamePhase } from '../types/GameTypes';

/** 一跳或到达结算的结果。ongoing 表示战斗还要继续。 */
export type BattleOutcome = 'ongoing' | 'capture' | 'fail';

export interface ArrivalResult {
    /** 为 true 时守军原本就是 0，已经占领，调用方不要再开始计时。 */
    capturedImmediately: boolean;
    toast: string | null;
}

export interface TickResult {
    outcome: BattleOutcome;
    /** 这一跳攻方实际扣除的兵力。0 表示不飘字。 */
    attackerLoss: number;
    /** 这一跳守军实际扣除的兵力。0 表示不飘字。 */
    defenderLoss: number;
    toast: string | null;
}

/**
 * 队伍到达目标坐标时调用。
 * 只处理行军阶段。守军大于 0 时不扣兵，只把阶段改为交战。
 */
export function onArmyArrived(session: GameSession): ArrivalResult {
    if (session.phase !== GamePhase.Marching || session.army === null) {
        return { capturedImmediately: false, toast: null };
    }

    const target = findStronghold(session, session.army.targetId);
    if (!target) {
        return { capturedImmediately: false, toast: null };
    }
    if (target.troops > 0) {
        session.phase = GamePhase.Battling;
        return { capturedImmediately: false, toast: null };
    }

    capture(session, target, session.army.troops);
    return { capturedImmediately: true, toast: GameText.captureSuccess };
}

/**
 * 结算一跳。调用前阶段必须已是交战。
 * 先扣双方兵力，再判定占领、失败或继续。
 */
export function applyBattleTick(session: GameSession): TickResult | null {
    if (session.phase !== GamePhase.Battling || session.army === null) {
        return null;
    }
    const target = findStronghold(session, session.army.targetId);
    if (!target) {
        return null;
    }

    const attackerLoss = Math.min(BATTLE_DAMAGE, session.army.troops);
    const defenderLoss = Math.min(BATTLE_DAMAGE, target.troops);
    session.army.troops -= attackerLoss;
    target.troops -= defenderLoss;

    if (target.troops === 0 && session.army.troops > 0) {
        capture(session, target, session.army.troops);
        return {
            outcome: 'capture',
            attackerLoss,
            defenderLoss,
            toast: GameText.captureSuccess,
        };
    }
    if (session.army.troops === 0 && target.troops > 0) {
        finishArmy(session);
        return {
            outcome: 'fail',
            attackerLoss,
            defenderLoss,
            toast: GameText.attackFail,
        };
    }
    if (session.army.troops === 0 && target.troops === 0) {
        finishArmy(session);
        return {
            outcome: 'fail',
            attackerLoss,
            defenderLoss,
            toast: GameText.attackFail,
        };
    }
    return {
        outcome: 'ongoing',
        attackerLoss,
        defenderLoss,
        toast: null,
    };
}

/** 把目标改成玩家，守军改为攻方剩余兵力。名称保持不变。 */
function capture(session: GameSession, target: { faction: Faction; troops: number; color: string }, attackerTroops: number): void {
    target.faction = Faction.Player;
    target.troops = attackerTroops;
    target.color = factionColor(Faction.Player);
    finishArmy(session);
}

/** 只读配置里的阵营色。三个阵营都有初始据点，因此总能取到。 */
function factionColor(faction: Faction): string {
    const sample = STRONGHOLDS.find((item) => item.faction === faction);
    return sample ? sample.color : '#2F6BFF';
}
