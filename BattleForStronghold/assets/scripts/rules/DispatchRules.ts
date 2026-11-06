import { DEFAULT_DISPATCH_AMOUNT, DISPATCH_INPUT_MAX_LENGTH, GameText } from '../config/GameConfig';
import { findStronghold, GameSession } from '../model/StrongholdState';
import { Faction, GamePhase, StrongholdId } from '../types/GameTypes';

/** 规则给出的一条提示。不需要提示时 toast 为 null。 */
export interface RuleNotice {
    toast: string | null;
}

export interface DispatchResult extends RuleNotice {
    /** 为 true 时，本次调用已经扣兵并生成队伍数据。 */
    ok: boolean;
}

/** 只保留数字，并截断到输入框允许的位数。空字符串可以保留。 */
export function sanitizeDispatchText(raw: string): string {
    return raw.replace(/\D/g, '').slice(0, DISPATCH_INPUT_MAX_LENGTH);
}

/**
 * 点击据点。
 * 行军和交战只更新 focusId，不改来源、目标和队伍。
 */
export function onStrongholdClick(session: GameSession, id: StrongholdId): RuleNotice {
    if (session.phase === GamePhase.Marching || session.phase === GamePhase.Battling) {
        session.focusId = id;
        return { toast: null };
    }

    const stronghold = findStronghold(session, id);
    if (!stronghold) {
        return { toast: null };
    }

    if (stronghold.faction === Faction.Player) {
        if (session.sourceId === id) {
            session.sourceId = null;
            session.targetId = null;
            session.dispatchText = '';
            session.phase = GamePhase.Idle;
            return { toast: null };
        }
        session.sourceId = id;
        session.targetId = null;
        session.dispatchText = defaultDispatchText(stronghold.troops);
        session.phase = GamePhase.SourceSelected;
        return { toast: null };
    }

    if (session.sourceId === null) {
        return { toast: GameText.onlyFromPlayer };
    }
    session.targetId = id;
    session.phase = GamePhase.SourceSelected;
    return { toast: null };
}

/**
 * 加减派遣数量。
 * 没有来源，或来源兵力为 0 时不改输入框。
 */
export function changeDispatchAmount(session: GameSession, delta: 1 | -1): RuleNotice {
    if (session.sourceId === null) {
        return { toast: GameText.selectSourceFirst };
    }
    const source = findStronghold(session, session.sourceId);
    if (!source || source.troops <= 0) {
        return { toast: GameText.notEnoughTroops };
    }

    const current = parseDispatchAmount(session.dispatchText);
    if (delta < 0) {
        const next = current === null || current <= 1 ? 1 : current - 1;
        session.dispatchText = String(next);
        return { toast: null };
    }

    const base = current === null ? 0 : current;
    const next = Math.min(source.troops, base + 1);
    session.dispatchText = String(next < 1 ? 1 : next);
    return { toast: null };
}

/**
 * 按固定顺序校验派遣。第一条失败就返回，不继续看后面的条件。
 * 成功时在这次调用里扣兵，并把阶段改为行军。
 */
export function tryDispatch(session: GameSession): DispatchResult {
    if (session.dispatchLock) {
        return { ok: false, toast: null };
    }

    if (session.phase === GamePhase.Marching || session.phase === GamePhase.Battling) {
        return { ok: false, toast: GameText.armyBusy };
    }
    if (session.sourceId === null) {
        return { ok: false, toast: GameText.selectSourceFirst };
    }

    const source = findStronghold(session, session.sourceId);
    if (!source || source.faction !== Faction.Player || source.troops < 1) {
        return { ok: false, toast: GameText.notEnoughTroops };
    }
    if (session.targetId === null) {
        return { ok: false, toast: GameText.selectTarget };
    }

    const target = findStronghold(session, session.targetId);
    if (!target || target.id === source.id || target.faction === source.faction) {
        return { ok: false, toast: GameText.invalidTarget };
    }

    const amount = parseDispatchAmount(session.dispatchText);
    if (amount === null || amount < 1) {
        return { ok: false, toast: GameText.invalidAmount };
    }
    if (amount > source.troops) {
        return { ok: false, toast: GameText.notEnoughTroops };
    }

    session.dispatchLock = true;
    source.troops -= amount;
    session.army = {
        sourceId: source.id,
        targetId: target.id,
        troops: amount,
    };
    session.phase = GamePhase.Marching;
    return { ok: true, toast: null };
}

/** 来源兵力为 0 时填 0，否则填 min(默认值, 当前兵力)。 */
function defaultDispatchText(troops: number): string {
    if (troops <= 0) {
        return '0';
    }
    return String(Math.min(DEFAULT_DISPATCH_AMOUNT, troops));
}

/** 只接受纯数字。空文本和带非数字的文本都视为无效。 */
function parseDispatchAmount(text: string): number | null {
    if (!/^\d+$/.test(text)) {
        return null;
    }
    const amount = Number(text);
    if (!Number.isInteger(amount)) {
        return null;
    }
    return amount;
}
