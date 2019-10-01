export interface ILoggingModel {
    log(level : LogLevel, message: string, object?: any) : void;
}

export class ConsoleLoggingModel implements ILoggingModel {
    private readonly minlevel : LogLevel;
    constructor(minLevel : LogLevel) {
        this.minlevel = minLevel;
    }

    log(level: LogLevel, message: string, object?: any): void {
        if (level < this.minlevel) {
            return;
        }

        console.log(`${new Date().toISOString()} - ${LogLevelStrings[level]} - ${message}${object ? ' - ' + JSON.stringify(object) : ''}`);
    }
}

export class NullLoggingModel implements ILoggingModel {
    log(level: LogLevel, message: string, object?: any): void {
    }
}

export enum LogLevel {
    DEBUG,
    INFO,
    ERROR
}

const LogLevelStrings = ["DEBUG", "INFO", "ERROR"];
