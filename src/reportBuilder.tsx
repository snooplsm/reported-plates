import ExifReader from "exifreader";
import { getFileHash } from "./api/file-utils";

class Report {

}

enum BuildReportFlow {
    pre_hash = 0,
    hash = 1,
    exif = 2,
    geo = 3
}

const steps = Object.values(BuildReportFlow).filter(value => typeof value === 'number').length;

type ProgressListener = (status: BuildReportFlow, steps: number, data:any|null) => void;

export const buildReport = (file:File, listener:ProgressListener|null=null) => {
    return new Promise<Report>(async (resolve, reject) => {
        listener?.(BuildReportFlow.pre_hash,steps,null);
        const hash = await getFileHash(file)
        listener?.(BuildReportFlow.hash,steps,hash)
        const tags = await ExifReader.load(file);
        listener?.(BuildReportFlow.exif,steps,tags)
    });
}