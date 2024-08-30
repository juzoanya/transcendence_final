/* eslint-disable max-classes-per-file */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable jsdoc/require-jsdoc */

interface ClientCommandResponse {
    success: boolean;
    cmd: "client-ready" | "client-done";
    id: number;
    message: string;
    status_code: number;
}

function filterClientCommandResponses<T extends ClientCommandResponse['cmd']>(
    responses: ClientCommandResponse[],
    cmd: T
): ClientCommandResponse & { cmd: T; }[] {
    return responses.filter(response => response.cmd === cmd) as (ClientCommandResponse & { cmd: T; })[];
}

const res: ClientCommandResponse[] = [
    {
        cmd: "client-done",
        id: 0,
        message: "",
        status_code: 3,
        success: false
    },
    {
        cmd: "client-ready",
        id: 0,
        message: "",
        status_code: 3,
        success: false
    }
];

const g = filterClientCommandResponses(res, "client-done");