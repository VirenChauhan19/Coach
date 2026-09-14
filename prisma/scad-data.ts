// AUTO-GENERATED from "SCAD XC 2026.xlsx". Do not edit by hand.
// 18 athletes (mileage groups + pace targets) and the full 4-phase plan.
//
// Phase 2 (weeks 9-12) updated from "SCAD XC 2026 phase 2.xlsx": the coach
// replaced the "3K/5K WO #1-#4" placeholders with the prescribed rep sessions.
//
// Week 15 (9/14-9/20), every pace target and every mileage group updated from
// "Training, 9-14.xlsx". That workbook restructured race week — Monday became a
// tempo-rep session and Wednesday a set of 90" reps — and introduced a fourth
// group, D, which only appears in the weeks the coach has written since.
//
// `group` is the row an athlete takes their *volume* from. `workoutGroup` is
// the row they take *quality sessions* from, present only when the coach splits
// the two ("VOL: C, WO: D" on the chart); see cellForAthlete() in classify.ts.
// Booker and Ryan have dropped off the chart and keep their previous entries.
// Aadhick is listed "TBD-INJ", which names no row, so he holds at B.
//
// Week 15 also carries that workbook's logistics rows — practice `time` and
// `loc`, the `lift` window and the evening team `meeting` — which earlier
// weeks predate. `liftTime` is the athlete's own slot inside that window;
// lifting happens on workout days.

export type Paces = { ez: string; tempo: string; tempoMed?: string; k10: string; k8: string; k6: string; k5: string; k3: string; mile: string };
export type AthleteSeed = { name: string; email: string; group: string; workoutGroup?: string; lrTarget: string; ezTarget: string; xtTarget?: string; doubleFreq: string; xtFreq: string; liftTime?: string; paces: Paces };
export type DayPlan = { A: string; B: string; C: string; D?: string; PR: string; time?: string; loc?: string; lift?: string; meeting?: string };
export type WeekPlan = { phase: number; week: number; theme: string; start: string; days: DayPlan[] };

export const ATHLETES: AthleteSeed[] = [
  {
    "name": "Vaclav",
    "email": "vaclav@scadxc.com",
    "group": "C",
    "lrTarget": "65-75",
    "ezTarget": "30-40",
    "xtTarget": "40-60",
    "doubleFreq": "0X",
    "xtFreq": "0X",
    "liftTime": "10:00 AM",
    "paces": {
      "ez": "6:46-6:52",
      "tempo": "5:16-5:20",
      "tempoMed": "5:24-5:28",
      "k10": "5:05-5:09",
      "k8": "5:01-5:05",
      "k6": "4:55-4:57",
      "k5": "4:52-4:56",
      "k3": "4:43-4:47",
      "mile": "4:16-4:18"
    }
  },
  {
    "name": "Jackson",
    "email": "jackson@scadxc.com",
    "group": "B",
    "lrTarget": "80-90",
    "ezTarget": "40-50",
    "xtTarget": "60-75",
    "doubleFreq": "1-2X",
    "xtFreq": "0X",
    "liftTime": "10:00 AM",
    "paces": {
      "ez": "6:46-6:52",
      "tempo": "5:16-5:20",
      "tempoMed": "5:24-5:28",
      "k10": "5:05-5:09",
      "k8": "5:01-5:05",
      "k6": "4:55-4:57",
      "k5": "4:52-4:56",
      "k3": "4:43-4:47",
      "mile": "4:16-4:18"
    }
  },
  {
    "name": "Booker",
    "email": "booker@scadxc.com",
    "group": "B",
    "lrTarget": "80-90",
    "ezTarget": "40-50",
    "doubleFreq": "0X",
    "xtFreq": "0X",
    "paces": {
      "ez": "6:46-6:54",
      "tempo": "5:16-5:22",
      "k10": "5:06-5:10",
      "k8": "5:01-5:05",
      "k6": "4:55-4:59",
      "k5": "4:53-4:57",
      "k3": "4:43-4:47",
      "mile": "4:22-4:26"
    }
  },
  {
    "name": "Ryan",
    "email": "ryan@scadxc.com",
    "group": "A",
    "lrTarget": "90-100",
    "ezTarget": "50-60",
    "doubleFreq": "0X",
    "xtFreq": "0X",
    "paces": {
      "ez": "7:00-7:08",
      "tempo": "5:27-5:33",
      "k10": "5:16-5:20",
      "k8": "5:12-5:16",
      "k6": "5:05-5:09",
      "k5": "5:03-5:07",
      "k3": "4:53-4:57",
      "mile": "4:22-4:26"
    }
  },
  {
    "name": "Sam",
    "email": "sam@scadxc.com",
    "group": "B",
    "lrTarget": "65-75",
    "ezTarget": "40-50",
    "xtTarget": "60-75",
    "doubleFreq": "0X",
    "xtFreq": "0X",
    "liftTime": "2:00 PM",
    "paces": {
      "ez": "7:22-7:28",
      "tempo": "5:44-5:48",
      "tempoMed": "5:53-5:57",
      "k10": "5:32-5:36",
      "k8": "5:27-5:31",
      "k6": "5:21-5:25",
      "k5": "5:18-5:22",
      "k3": "5:08-5:12",
      "mile": "4:36-4:40"
    }
  },
  {
    "name": "Aadhick",
    "email": "aadhick@scadxc.com",
    "group": "B",
    "lrTarget": "80-90",
    "ezTarget": "40-50",
    "xtTarget": "60-75",
    "doubleFreq": "0X",
    "xtFreq": "1X",
    "liftTime": "10:00 AM",
    "paces": {
      "ez": "7:22-7:28",
      "tempo": "5:44-5:48",
      "tempoMed": "5:53-5:57",
      "k10": "5:32-5:36",
      "k8": "5:27-5:31",
      "k6": "5:21-5:25",
      "k5": "5:18-5:22",
      "k3": "5:08-5:12",
      "mile": "4:36-4:40"
    }
  },
  {
    "name": "Avery R.",
    "email": "averyr@scadxc.com",
    "group": "A",
    "lrTarget": "90-100",
    "ezTarget": "50-60",
    "xtTarget": "60-75",
    "doubleFreq": "1-2X",
    "xtFreq": "0X",
    "liftTime": "2:00 PM",
    "paces": {
      "ez": "7:50-7:56",
      "tempo": "6:06-6:10",
      "tempoMed": "6:15-6:19",
      "k10": "5:54-5:58",
      "k8": "5:49-5:53",
      "k6": "5:42-5:46",
      "k5": "5:38-5:42",
      "k3": "5:28-5:32",
      "mile": "4:58-5:02"
    }
  },
  {
    "name": "Edie",
    "email": "edie@scadxc.com",
    "group": "A",
    "lrTarget": "90-100",
    "ezTarget": "50-60",
    "xtTarget": "60-75",
    "doubleFreq": "1-2X",
    "xtFreq": "0X",
    "liftTime": "10:00 AM",
    "paces": {
      "ez": "7:50-7:56",
      "tempo": "6:06-6:10",
      "tempoMed": "6:15-6:19",
      "k10": "5:54-5:58",
      "k8": "5:49-5:53",
      "k6": "5:42-5:46",
      "k5": "5:38-5:42",
      "k3": "5:28-5:32",
      "mile": "4:58-5:02"
    }
  },
  {
    "name": "Viren",
    "email": "viren@scadxc.com",
    "group": "C",
    "lrTarget": "80-90",
    "ezTarget": "40-50",
    "xtTarget": "60-75",
    "doubleFreq": "0X",
    "xtFreq": "3X",
    "liftTime": "5:00 PM",
    "paces": {
      "ez": "8:33-8:39",
      "tempo": "6:40-6:44",
      "tempoMed": "6:50-6:54",
      "k10": "6:26-6:30",
      "k8": "6:20-6:24",
      "k6": "6:13-6:17",
      "k5": "6:09-6:13",
      "k3": "5:58-6:02",
      "mile": "4:58-5:02"
    }
  },
  {
    "name": "Meredith",
    "email": "meredith@scadxc.com",
    "group": "C",
    "workoutGroup": "D",
    "lrTarget": "80-90",
    "ezTarget": "40-50",
    "xtTarget": "60-75",
    "doubleFreq": "0X",
    "xtFreq": "2-3X",
    "liftTime": "10:00 AM",
    "paces": {
      "ez": "8:33-8:39",
      "tempo": "6:40-6:44",
      "tempoMed": "6:50-6:54",
      "k10": "6:26-6:30",
      "k8": "6:20-6:24",
      "k6": "6:13-6:17",
      "k5": "6:09-6:13",
      "k3": "5:58-6:02",
      "mile": "5:16-5:20"
    }
  },
  {
    "name": "Gray",
    "email": "gray@scadxc.com",
    "group": "B",
    "lrTarget": "80-90",
    "ezTarget": "40-50",
    "xtTarget": "60-75",
    "doubleFreq": "0X",
    "xtFreq": "1-2X",
    "liftTime": "2:00 PM",
    "paces": {
      "ez": "8:33-8:39",
      "tempo": "6:40-6:44",
      "tempoMed": "6:50-6:54",
      "k10": "6:26-6:30",
      "k8": "6:20-6:24",
      "k6": "6:13-6:17",
      "k5": "6:09-6:13",
      "k3": "5:58-6:02",
      "mile": "5:16-5:20"
    }
  },
  {
    "name": "Avery V.",
    "email": "averyv@scadxc.com",
    "group": "C",
    "lrTarget": "65-75",
    "ezTarget": "30-40",
    "xtTarget": "40-60",
    "doubleFreq": "0X",
    "xtFreq": "0X",
    "liftTime": "2:00 PM",
    "paces": {
      "ez": "8:33-8:39",
      "tempo": "6:40-6:44",
      "tempoMed": "6:50-6:54",
      "k10": "6:26-6:30",
      "k8": "6:20-6:24",
      "k6": "6:13-6:17",
      "k5": "6:09-6:13",
      "k3": "5:58-6:02",
      "mile": "5:16-5:20"
    }
  },
  {
    "name": "Azalea",
    "email": "azalea@scadxc.com",
    "group": "B",
    "lrTarget": "80-90",
    "ezTarget": "40-50",
    "xtTarget": "60-75",
    "doubleFreq": "0X",
    "xtFreq": "0X",
    "liftTime": "5:00 PM",
    "paces": {
      "ez": "8:33-8:39",
      "tempo": "6:40-6:44",
      "tempoMed": "6:50-6:54",
      "k10": "6:26-6:30",
      "k8": "6:20-6:24",
      "k6": "6:13-6:17",
      "k5": "6:09-6:13",
      "k3": "5:58-6:02",
      "mile": "5:16-5:20"
    }
  },
  {
    "name": "Clara",
    "email": "clara@scadxc.com",
    "group": "B",
    "lrTarget": "80-90",
    "ezTarget": "40-50",
    "xtTarget": "60-75",
    "doubleFreq": "0X",
    "xtFreq": "1X",
    "liftTime": "2:00 PM",
    "paces": {
      "ez": "8:33-8:39",
      "tempo": "6:40-6:44",
      "tempoMed": "6:50-6:54",
      "k10": "6:26-6:30",
      "k8": "6:20-6:24",
      "k6": "6:13-6:17",
      "k5": "6:09-6:13",
      "k3": "5:58-6:02",
      "mile": "5:16-5:20"
    }
  },
  {
    "name": "Samyiah",
    "email": "samyiah@scadxc.com",
    "group": "C",
    "lrTarget": "65-75",
    "ezTarget": "30-40",
    "xtTarget": "40-60",
    "doubleFreq": "0X",
    "xtFreq": "0X",
    "liftTime": "2:00 PM",
    "paces": {
      "ez": "8:33-8:39",
      "tempo": "6:40-6:44",
      "tempoMed": "6:50-6:54",
      "k10": "6:26-6:30",
      "k8": "6:20-6:24",
      "k6": "6:13-6:17",
      "k5": "6:09-6:13",
      "k3": "5:58-6:02",
      "mile": "5:16-5:20"
    }
  },
  {
    "name": "Alex",
    "email": "alex@scadxc.com",
    "group": "C",
    "lrTarget": "65-75",
    "ezTarget": "30-40",
    "xtTarget": "40-60",
    "doubleFreq": "0X",
    "xtFreq": "1X",
    "liftTime": "2:00 PM",
    "paces": {
      "ez": "8:33-8:39",
      "tempo": "6:40-6:44",
      "tempoMed": "6:50-6:54",
      "k10": "6:26-6:30",
      "k8": "6:20-6:24",
      "k6": "6:13-6:17",
      "k5": "6:09-6:13",
      "k3": "5:58-6:02",
      "mile": "5:16-5:20"
    }
  },
  {
    "name": "Paige",
    "email": "paige@scadxc.com",
    "group": "C",
    "workoutGroup": "D",
    "lrTarget": "65-75",
    "ezTarget": "30-40",
    "xtTarget": "40-60",
    "doubleFreq": "0X",
    "xtFreq": "1-2X",
    "liftTime": "OYO",
    "paces": {
      "ez": "9:02-9:08",
      "tempo": "7:02-7:06",
      "tempoMed": "7:13-7:17",
      "k10": "6:48-6:52",
      "k8": "6:42-6:46",
      "k6": "6:34-6:38",
      "k5": "6:30-6:34",
      "k3": "6:18-6:22",
      "mile": "5:28-5:32"
    }
  },
  {
    "name": "Corinne",
    "email": "corinne@scadxc.com",
    "group": "A",
    "lrTarget": "90-100",
    "ezTarget": "50-60",
    "xtTarget": "60-75",
    "doubleFreq": "0X",
    "xtFreq": "0X",
    "liftTime": "2:00 PM",
    "paces": {
      "ez": "10:21-10:27",
      "tempo": "8:04-8:08",
      "tempoMed": "8:16-8:20",
      "k10": "7:47-7:51",
      "k8": "7:40-7:44",
      "k6": "7:31-7:35",
      "k5": "7:27-7:31",
      "k3": "7:13-7:17",
      "mile": "6:30-6:34"
    }
  }
];

export const WEEKS: WeekPlan[] = [
  {
    "phase": 1,
    "week": 1,
    "theme": "BASE (NO DOUBLES)",
    "start": "2026-06-08",
    "days": [
      {
        "A": "40-50' EZ",
        "B": "30-40' EZ",
        "C": "20-30' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "OFF",
        "B": "OFF",
        "C": "OFF",
        "PR": "NONE"
      },
      {
        "A": "40-50' EZ",
        "B": "30-40' EZ",
        "C": "25-35' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "40-50' EZ",
        "B": "30-40' EZ",
        "C": "25-35' EZ",
        "PR": "NONE"
      },
      {
        "A": "OFF",
        "B": "OFF",
        "C": "OFF",
        "PR": "NONE"
      },
      {
        "A": "50-60' EZ",
        "B": "40-50' EZ",
        "C": "30-40' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "OFF",
        "B": "OFF",
        "C": "OFF",
        "PR": "TRAINING RECAP"
      }
    ]
  },
  {
    "phase": 1,
    "week": 2,
    "theme": "BASE (NO DOUBLES)",
    "start": "2026-06-15",
    "days": [
      {
        "A": "50-60' EZ",
        "B": "40-50' EZ",
        "C": "30-40' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "2X6X20\"/40\"/3' EI @ 3K-5K",
        "B": "2X6X20\"/40\"/3' EI @ 3K-5K",
        "C": "2X6X20\"/40\"/3' EI @ 3K-5K",
        "PR": "FUEL + DAY 1 LIFT + CORE & HIP"
      },
      {
        "A": "OFF",
        "B": "OFF",
        "C": "OFF",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "50-60' EZ",
        "B": "40-50' EZ",
        "C": "30-40' EZ",
        "PR": "FUEL + DAY 2 LIFT + CORE & HIP"
      },
      {
        "A": "40-50' EZ",
        "B": "30-40' EZ",
        "C": "25-35' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "60-70' EZ",
        "B": "45-55' EZ",
        "C": "35-45' EZ",
        "PR": "FUEL"
      },
      {
        "A": "OFF",
        "B": "OFF",
        "C": "OFF",
        "PR": "TRAINING RECAP"
      }
    ]
  },
  {
    "phase": 1,
    "week": 3,
    "theme": "BASE (NO DOUBLES)",
    "start": "2026-06-22",
    "days": [
      {
        "A": "50-60' EZ",
        "B": "40-50' EZ",
        "C": "30-40' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "3X6X20\"/40\"/3' EI @ 3K-5K",
        "B": "3X6X20\"/40\"/3' EI @ 3K-5K",
        "C": "3X6X20\"/40\"/3' EI @ 3K-5K",
        "PR": "FUEL + DAY 1 LIFT + CORE & HIP"
      },
      {
        "A": "OFF",
        "B": "OFF",
        "C": "OFF",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "50-60' EZ",
        "B": "40-50' EZ",
        "C": "30-40' EZ",
        "PR": "FUEL + DAY 2 LIFT + CORE & HIP"
      },
      {
        "A": "40-50' EZ",
        "B": "30-40' EZ",
        "C": "25-35' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "70-80' EZ",
        "B": "55-65' EZ",
        "C": "45-55' EZ",
        "PR": "FUEL"
      },
      {
        "A": "OFF",
        "B": "OFF",
        "C": "OFF",
        "PR": "TRAINING RECAP"
      }
    ]
  },
  {
    "phase": 1,
    "week": 4,
    "theme": "BASE (NO DOUBLES)",
    "start": "2026-06-29",
    "days": [
      {
        "A": "60-70' EZ + 6-8 X 20\" STRIDES @ MILE",
        "B": "45-55' EZ + 6-8 X 20\" STRIDES @ MILE",
        "C": "35-45' EZ + 6-8 X 20\" STRIDES @ MILE",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "2X4X40\"/80\"/3' EI @ 3K-5K",
        "B": "2X4X40\"/80\"/3' EI @ 3K-5K",
        "C": "2X4X40\"/80\"/3' EI @ 3K-5K",
        "PR": "FUEL + DAY 1 LIFT + CORE & HIP"
      },
      {
        "A": "40-50' EZ",
        "B": "30-40' EZ",
        "C": "25-35' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "60-70' EZ + 6-8 X 20\" STRIDES @ MILE",
        "B": "45-55' EZ + 6-8 X 20\" STRIDES @ MILE",
        "C": "35-45' EZ + 6-8 X 20\" STRIDES @ MILE",
        "PR": "FUEL + DAY 2 LIFT + CORE & HIP"
      },
      {
        "A": "40-50' EZ",
        "B": "30-40' EZ",
        "C": "25-35' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "80-90' EZ",
        "B": "65-75' EZ",
        "C": "55-65' EZ",
        "PR": "FUEL"
      },
      {
        "A": "OFF",
        "B": "OFF",
        "C": "OFF",
        "PR": "TRAINING RECAP"
      }
    ]
  },
  {
    "phase": 1,
    "week": 5,
    "theme": "BASE (NO DOUBLES)",
    "start": "2026-07-06",
    "days": [
      {
        "A": "60-70' EZ + 6-8 X 20\" STRIDES @ MILE",
        "B": "45-55' EZ + 6-8 X 20\" STRIDES @ MILE",
        "C": "35-45' EZ + 6-8 X 20\" STRIDES @ MILE",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "3X4X40\"/80\"/3' EI @ 3K-5K",
        "B": "3X4X40\"/80\"/3' EI @ 3K-5K",
        "C": "3X4X40\"/80\"/3' EI @ 3K-5K",
        "PR": "FUEL + DAY 1 LIFT + CORE & HIP"
      },
      {
        "A": "40-50' EZ",
        "B": "30-40' EZ",
        "C": "25-35' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "60-70' EZ + 6-8 X 20\" STRIDES @ MILE",
        "B": "45-55' EZ + 6-8 X 20\" STRIDES @ MILE",
        "C": "35-45' EZ + 6-8 X 20\" STRIDES @ MILE",
        "PR": "FUEL + DAY 2 LIFT + CORE & HIP"
      },
      {
        "A": "40-50' EZ",
        "B": "30-40' EZ",
        "C": "25-35' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "80-90' EZ",
        "B": "70-80' EZ",
        "C": "55-65' EZ",
        "PR": "FUEL"
      },
      {
        "A": "OFF",
        "B": "OFF",
        "C": "OFF",
        "PR": "TRAINING RECAP"
      }
    ]
  },
  {
    "phase": 1,
    "week": 6,
    "theme": "BASE (NO DOUBLES)",
    "start": "2026-07-13",
    "days": [
      {
        "A": "70-80' EZ + 6-8 X 20\" STRIDES @ MILE",
        "B": "55-65' EZ + 6-8 X 20\" STRIDES @ MILE",
        "C": "40-50' EZ + 6-8 X 20\" STRIDES @ MILE",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "2X3X60\"/120\"/4' EI @ 3K-5K",
        "B": "2X3X60\"/120\"/4' EI @ 3K-5K",
        "C": "2X3X60\"/120\"/4' EI @ 3K-5K",
        "PR": "FUEL + DAY 1 LIFT + CORE & HIP"
      },
      {
        "A": "50-60' EZ",
        "B": "40-50' EZ",
        "C": "30-40' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "70-80' EZ + 6-8 X 20\" STRIDES @ MILE",
        "B": "55-65' EZ + 6-8 X 20\" STRIDES @ MILE",
        "C": "40-50' EZ + 6-8 X 20\" STRIDES @ MILE",
        "PR": "FUEL + DAY 2 LIFT + CORE & HIP"
      },
      {
        "A": "50-60' EZ",
        "B": "40-50' EZ",
        "C": "30-40' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "90-100' EZ",
        "B": "80-90' EZ",
        "C": "65-75' EZ",
        "PR": "FUEL"
      },
      {
        "A": "OFF",
        "B": "OFF",
        "C": "OFF",
        "PR": "TRAINING RECAP"
      }
    ]
  },
  {
    "phase": 1,
    "week": 7,
    "theme": "BASE (NO DOUBLES)",
    "start": "2026-07-20",
    "days": [
      {
        "A": "70-80' EZ + 6-8 X 20\" STRIDES @ MILE",
        "B": "55-65' EZ + 6-8 X 20\" STRIDES @ MILE",
        "C": "40-50' EZ + 6-8 X 20\" STRIDES @ MILE",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "3X3X60\"/120\"/4' EI @ 3K-5K",
        "B": "3X3X60\"/120\"/4' EI @ 3K-5K",
        "C": "3X3X60\"/120\"/4' EI @ 3K-5K",
        "PR": "FUEL + DAY 1 LIFT + CORE & HIP"
      },
      {
        "A": "50-60' EZ",
        "B": "40-50' EZ",
        "C": "30-40' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "70-80' EZ + 6-8 X 20\" STRIDES @ MILE",
        "B": "55-65' EZ + 6-8 X 20\" STRIDES @ MILE",
        "C": "40-50' EZ + 6-8 X 20\" STRIDES @ MILE",
        "PR": "FUEL + DAY 2 LIFT + CORE & HIP"
      },
      {
        "A": "50-60' EZ",
        "B": "40-50' EZ",
        "C": "30-40' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "70-80' EZ",
        "B": "60-70' EZ",
        "C": "50-60' EZ",
        "PR": "FUEL"
      },
      {
        "A": "OFF",
        "B": "OFF",
        "C": "OFF",
        "PR": "TRAINING RECAP"
      }
    ]
  },
  {
    "phase": 1,
    "week": 8,
    "theme": "DW (NO DOUBLES)",
    "start": "2026-07-27",
    "days": [
      {
        "A": "60-70' EZ + 6-8 X 20\" STRIDES @ MILE",
        "B": "45-55' EZ + 6-8 X 20\" STRIDES @ MILE",
        "C": "35-45' EZ + 6-8 X 20\" STRIDES @ MILE",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "3X4X40\"/80\"/3' EI @ 3K-5K",
        "B": "3X4X40\"/80\"/3' EI @ 3K-5K",
        "C": "3X4X40\"/80\"/3' EI @ 3K-5K",
        "PR": "FUEL + DAY 1 LIFT + CORE & HIP"
      },
      {
        "A": "40-50' EZ",
        "B": "30-40' EZ",
        "C": "25-35' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "60-70' EZ + 6-8 X 20\" STRIDES @ MILE",
        "B": "45-55' EZ + 6-8 X 20\" STRIDES @ MILE",
        "C": "35-45' EZ + 6-8 X 20\" STRIDES @ MILE",
        "PR": "FUEL + DAY 2 LIFT + CORE & HIP"
      },
      {
        "A": "40-50' EZ",
        "B": "30-40' EZ",
        "C": "25-35' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "90-100' EZ",
        "B": "80-90' EZ",
        "C": "65-75' EZ",
        "PR": "FUEL"
      },
      {
        "A": "OFF",
        "B": "OFF",
        "C": "OFF",
        "PR": "TRAINING RECAP"
      }
    ]
  },
  {
    "phase": 2,
    "week": 9,
    "theme": "BASE (1 DOUBLE IF APPLICABLE)",
    "start": "2026-08-03",
    "days": [
      {
        "A": "70-80' EZ + 6-8 X 20\" STRIDES @ MILE",
        "B": "55-65' EZ + 6-8 X 20\" STRIDES @ MILE",
        "C": "40-50' EZ + 6-8 X 20\" STRIDES @ MILE",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "10-12 X 1' @ 3K-5K W/ 1'",
        "B": "10-12 X 1' @ 3K-5K W/ 1'",
        "C": "10-12 X 1' @ 3K-5K W/ 1'",
        "PR": "FUEL + DAY 1 LIFT + CORE & HIP"
      },
      {
        "A": "50-60' EZ",
        "B": "40-50' EZ",
        "C": "30-40' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "70-80' EZ + 6-8 X 20\" STRIDES @ MILE",
        "B": "55-65' EZ + 6-8 X 20\" STRIDES @ MILE",
        "C": "40-50' EZ + 6-8 X 20\" STRIDES @ MILE",
        "PR": "FUEL + DAY 2 LIFT + CORE & HIP"
      },
      {
        "A": "50-60' EZ",
        "B": "40-50' EZ",
        "C": "30-40' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "90-100' EZ",
        "B": "80-90' EZ",
        "C": "65-75' EZ",
        "PR": "FUEL"
      },
      {
        "A": "OFF",
        "B": "OFF",
        "C": "OFF",
        "PR": "TRAINING RECAP"
      }
    ]
  },
  {
    "phase": 2,
    "week": 10,
    "theme": "BASE (1 DOUBLE IF APPLICABLE)",
    "start": "2026-08-10",
    "days": [
      {
        "A": "70-80' EZ + 6-8 X 20\" STRIDES @ MILE",
        "B": "55-65' EZ + 6-8 X 20\" STRIDES @ MILE",
        "C": "40-50' EZ + 6-8 X 20\" STRIDES @ MILE",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "8-10 X 90\" @ 3K-5K W/ 75\"",
        "B": "8-10 X 90\" @ 3K-5K W/ 75\"",
        "C": "8-10 X 90\" @ 3K-5K W/ 75\"",
        "PR": "FUEL + DAY 1 LIFT + CORE & HIP"
      },
      {
        "A": "50-60' EZ",
        "B": "40-50' EZ",
        "C": "30-40' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "70-80' EZ + 6-8 X 1' @ TEMPO W/ 2-3'",
        "B": "55-65' EZ + 6-8 X 1' @ TEMPO W/ 2-3'",
        "C": "40-50' EZ + 6-8 X 1' @ TEMPO W/ 2-3'",
        "PR": "FUEL + DAY 2 LIFT + CORE & HIP"
      },
      {
        "A": "50-60' EZ",
        "B": "40-50' EZ",
        "C": "30-40' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "90-100' EZ",
        "B": "80-90' EZ",
        "C": "65-75' EZ",
        "PR": "FUEL"
      },
      {
        "A": "OFF",
        "B": "OFF",
        "C": "OFF",
        "PR": "TRAINING RECAP"
      }
    ]
  },
  {
    "phase": 2,
    "week": 11,
    "theme": "BASE (2 DOUBLES IF APPLICABLE)",
    "start": "2026-08-17",
    "days": [
      {
        "A": "70-80' EZ + 6-8 X 20\" STRIDES @ MILE",
        "B": "55-65' EZ + 6-8 X 20\" STRIDES @ MILE",
        "C": "40-50' EZ + 6-8 X 20\" STRIDES @ MILE",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "6-8 X 2' @ 3K-5K W/ 90\"",
        "B": "6-8 X 2' @ 3K-5K W/ 90\"",
        "C": "6-8 X 2' @ 3K-5K W/ 90\"",
        "PR": "FUEL + DAY 1 LIFT + CORE & HIP"
      },
      {
        "A": "50-60' EZ",
        "B": "40-50' EZ",
        "C": "30-40' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "70-80' EZ + 6-8 X 20\" STRIDES @ MILE",
        "B": "55-65' EZ + 6-8 X 20\" STRIDES @ MILE",
        "C": "40-50' EZ + 6-8 X 20\" STRIDES @ MILE",
        "PR": "FUEL + DAY 2 LIFT + CORE & HIP"
      },
      {
        "A": "50-60' EZ",
        "B": "40-50' EZ",
        "C": "30-40' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "90-100' EZ",
        "B": "80-90' EZ",
        "C": "65-75' EZ",
        "PR": "FUEL"
      },
      {
        "A": "OFF",
        "B": "OFF",
        "C": "OFF",
        "PR": "TRAINING RECAP"
      }
    ]
  },
  {
    "phase": 2,
    "week": 12,
    "theme": "BASE (2 DOUBLES IF APPLICABLE)",
    "start": "2026-08-24",
    "days": [
      {
        "A": "70-80' EZ + 6-8 X 20\" STRIDES @ MILE",
        "B": "55-65' EZ + 6-8 X 20\" STRIDES @ MILE",
        "C": "40-50' EZ + 6-8 X 20\" STRIDES @ MILE",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "5-6 X 3' @ 3K-5K W/ 2-3'",
        "B": "5-6 X 3' @ 3K-5K W/ 2-3'",
        "C": "5-6 X 3' @ 3K-5K W/ 2-3'",
        "PR": "FUEL + DAY 1 LIFT + CORE & HIP"
      },
      {
        "A": "50-60' EZ",
        "B": "40-50' EZ",
        "C": "30-40' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "70-80' EZ + 5-7 X 2' @ TEMPO W/ 2-3'",
        "B": "55-65' EZ + 5-7 X 2' @ TEMPO W/ 2-3'",
        "C": "40-50' EZ + 5-7 X 2' @ TEMPO W/ 2-3'",
        "PR": "FUEL + DAY 2 LIFT + CORE & HIP"
      },
      {
        "A": "50-60' EZ",
        "B": "40-50' EZ",
        "C": "30-40' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "70-80' EZ",
        "B": "60-70' EZ",
        "C": "50-60' EZ",
        "PR": "FUEL"
      },
      {
        "A": "OFF",
        "B": "OFF",
        "C": "OFF",
        "PR": "TRAINING RECAP"
      }
    ]
  },
  {
    "phase": 2,
    "week": 13,
    "theme": "DW (NO DOUBLES)",
    "start": "2026-08-31",
    "days": [
      {
        "A": "60-70' EZ + 6-8 X 20\" STRIDES @ MILE",
        "B": "45-55' EZ + 6-8 X 20\" STRIDES @ MILE",
        "C": "35-45' EZ + 6-8 X 20\" STRIDES @ MILE",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "3X4X40\"/80\"/3' EI",
        "B": "3X4X40\"/80\"/3' EI",
        "C": "3X4X40\"/80\"/3' EI",
        "PR": "FUEL + DAY 1 LIFT + CORE & HIP"
      },
      {
        "A": "40-50' EZ",
        "B": "30-40' EZ",
        "C": "25-35' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "PRE-MEET EI",
        "B": "PRE-MEET EI",
        "C": "PRE-MEET EI",
        "PR": "FUEL + DAY 2 LIFT + CORE & HIP"
      },
      {
        "A": "FOOTHILLS INV",
        "B": "FOOTHILLS INV",
        "C": "FOOTHILLS INV",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "OFF",
        "B": "OFF",
        "C": "OFF",
        "PR": "NONE"
      },
      {
        "A": "90-100' EZ",
        "B": "80-90' EZ",
        "C": "65-75' EZ",
        "PR": "FUEL + TRAINING RECAP"
      }
    ]
  },
  {
    "phase": 3,
    "week": 14,
    "theme": "BASE (NO DOUBLES)",
    "start": "2026-09-07",
    "days": [
      {
        "A": "50-60' EZ",
        "B": "40-50' EZ",
        "C": "30-40' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "70-80' EZ + 6-8 X 20\" STRIDES @ MILE",
        "B": "55-65' EZ + 6-8 X 20\" STRIDES @ MILE",
        "C": "40-50' EZ + 6-8 X 20\" STRIDES @ MILE",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "TEMPO WO #1",
        "B": "TEMPO WO #1",
        "C": "TEMPO WO #1",
        "PR": "FUEL + DAY 1 LIFT + CORE & HIP"
      },
      {
        "A": "50-60' EZ",
        "B": "40-50' EZ",
        "C": "30-40' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "8K/6K INTRO WO #1",
        "B": "8K/6K INTRO WO #1",
        "C": "8K/6K INTRO WO #1",
        "PR": "FUEL + DAY 2 LIFT + CORE & HIP"
      },
      {
        "A": "50-60' EZ",
        "B": "40-50' EZ",
        "C": "30-40' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "90-100' EZ",
        "B": "80-90' EZ",
        "C": "65-75' EZ",
        "PR": "FUEL + TRAINING RECAP"
      }
    ]
  },
  {
    "phase": 3,
    "week": 15,
    "theme": "BASE (NO DOUBLES)",
    "start": "2026-09-14",
    "days": [
      {
        "A": "5-7 X 5' @ ST-MT W/ 60-90\"",
        "B": "5-7 X 5' @ ST-MT W/ 60-90\"",
        "C": "5-7 X 5' @ ST-MT W/ 60-90\"",
        "D": "6-8 X 3' @ ST-MT W/ 1'",
        "PR": "FUEL + DAY 1 LIFT + CORE & HIP + RECOVERY",
        "time": "6:50 AM",
        "loc": "-1 (Armour Drive)",
        "lift": "10:00, 2:00, 5:00",
        "meeting": "Men: 8PM"
      },
      {
        "A": "50-60' EZ",
        "B": "40-50' EZ",
        "C": "30-40' EZ",
        "D": "20-30' EZ",
        "PR": "FUEL + LIGHT STRETCH",
        "time": "8:00 AM",
        "loc": "-1 (Piedmont)",
        "meeting": "Women: 8PM"
      },
      {
        "A": "8-10 X 90\" @ 8K/6K W/ 60/90\"",
        "B": "8-10 X 90\" @ 8K/6K W/ 60/90\"",
        "C": "8-10 X 90\" @ 8K/6K W/ 60/90\"",
        "D": "8-10 X 90\" @ 8K/6K W/ 60/90\"",
        "PR": "FUEL + DAY 2 LIFT + CORE & HIP + RECOVERY",
        "time": "7:00 AM",
        "loc": "-1 (Piedmont)",
        "lift": "10:00, 2:00, 5:00"
      },
      {
        "A": "50-60' EZ",
        "B": "40-50' EZ",
        "C": "30-40' EZ",
        "D": "20-30' EZ",
        "PR": "FUEL + LIGHT STRETCH",
        "loc": "OYO pending TR subm."
      },
      {
        "A": "PRE-MEET EI: 2X5X20\"/40\"/3' EI @ GP",
        "B": "PRE-MEET EI: 2X5X20\"/40\"/3' EI @ GP",
        "C": "PRE-MEET EI: 2X5X20\"/40\"/3' EI @ GP",
        "D": "PRE-MEET EI: 2X5X20\"/40\"/3' EI @ GP",
        "PR": "FUEL + RECOVERY",
        "time": "9:00 AM",
        "loc": "-1 (Piedmont)"
      },
      {
        "A": "CONVERSE KICK-OFF",
        "B": "CONVERSE KICK-OFF",
        "C": "CONVERSE KICK-OFF",
        "D": "CONVERSE KICK-OFF",
        "PR": "FUEL + LIGHT STRETCH",
        "time": "TBD",
        "loc": "Meet site"
      },
      {
        "A": "OFF",
        "B": "OFF",
        "C": "OFF",
        "D": "OFF",
        "PR": "TRAINING RECAP"
      }
    ]
  },
  {
    "phase": 3,
    "week": 16,
    "theme": "BASE (NO DOUBLES)",
    "start": "2026-09-21",
    "days": [
      {
        "A": "90-100' EZ",
        "B": "80-90' EZ",
        "C": "65-75' EZ",
        "PR": "FUEL"
      },
      {
        "A": "50-60' EZ",
        "B": "40-50' EZ",
        "C": "30-40' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "TEMPO WO #3",
        "B": "TEMPO WO #3",
        "C": "TEMPO WO #3",
        "PR": "FUEL + DAY 1 LIFT + CORE & HIP"
      },
      {
        "A": "50-60' EZ",
        "B": "40-50' EZ",
        "C": "30-40' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "3K/5K SECONDARY WO",
        "B": "3K/5K SECONDARY WO",
        "C": "3K/5K SECONDARY WO",
        "PR": "FUEL + DAY 2 LIFT + CORE & HIP"
      },
      {
        "A": "50-60' EZ",
        "B": "40-50' EZ",
        "C": "30-40' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "90-100' EZ",
        "B": "80-90' EZ",
        "C": "65-75' EZ",
        "PR": "FUEL + TRAINING RECAP"
      }
    ]
  },
  {
    "phase": 3,
    "week": 17,
    "theme": "BASE (NO DOUBLES)",
    "start": "2026-09-28",
    "days": [
      {
        "A": "OFF",
        "B": "OFF",
        "C": "OFF",
        "PR": "NONE"
      },
      {
        "A": "70-80' EZ + 6-8 X 20\" STRIDES @ MILE",
        "B": "55-65' EZ + 6-8 X 20\" STRIDES @ MILE",
        "C": "40-50' EZ + 6-8 X 20\" STRIDES @ MILE",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "TEMPO WO #4",
        "B": "TEMPO WO #4",
        "C": "TEMPO WO #4",
        "PR": "FUEL + DAY 1 LIFT + CORE & HIP"
      },
      {
        "A": "50-60' EZ",
        "B": "40-50' EZ",
        "C": "30-40' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "8K/6K INTRO WO #2",
        "B": "8K/6K INTRO WO #2",
        "C": "8K/6K INTRO WO #2",
        "PR": "FUEL + DAY 2 LIFT + CORE & HIP"
      },
      {
        "A": "50-60' EZ",
        "B": "40-50' EZ",
        "C": "30-40' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "70-80' EZ",
        "B": "60-70' EZ",
        "C": "50-60' EZ",
        "PR": "FUEL + TRAINING RECAP"
      }
    ]
  },
  {
    "phase": 3,
    "week": 18,
    "theme": "BASE (NO DOUBLES)",
    "start": "2026-10-05",
    "days": [
      {
        "A": "40-50' EZ",
        "B": "30-40' EZ",
        "C": "25-35' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "3X4X40\"/80\"/3' EI @ 3K-5K",
        "B": "3X4X40\"/80\"/3' EI @ 3K-5K",
        "C": "3X4X40\"/80\"/3' EI @ 3K-5K",
        "PR": "FUEL + DAY 1 LIFT + CORE & HIP"
      },
      {
        "A": "40-50' EZ",
        "B": "30-40' EZ",
        "C": "25-35' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "PRE-MEET EI",
        "B": "PRE-MEET EI",
        "C": "PRE-MEET EI",
        "PR": "FUEL + DAY 2 LIFT + CORE & HIP"
      },
      {
        "A": "ROYALS XC CHALLENGE",
        "B": "ROYALS XC CHALLENGE",
        "C": "ROYALS XC CHALLENGE",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "OFF",
        "B": "OFF",
        "C": "OFF",
        "PR": "NONE"
      },
      {
        "A": "90-100' EZ",
        "B": "80-90' EZ",
        "C": "65-75' EZ",
        "PR": "FUEL + TRAINING RECAP"
      }
    ]
  },
  {
    "phase": 4,
    "week": 19,
    "theme": "BASE (NO DOUBLES)",
    "start": "2026-10-12",
    "days": [
      {
        "A": "50-60' EZ",
        "B": "40-50' EZ",
        "C": "30-40' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "70-80' EZ + 6-8 X 20\" STRIDES @ MILE",
        "B": "55-65' EZ + 6-8 X 20\" STRIDES @ MILE",
        "C": "40-50' EZ + 6-8 X 20\" STRIDES @ MILE",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "8K/6K WO #1",
        "B": "8K/6K WO #1",
        "C": "8K/6K WO #1",
        "PR": "FUEL + DAY 1 LIFT + CORE & HIP"
      },
      {
        "A": "50-60' EZ",
        "B": "40-50' EZ",
        "C": "30-40' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "TEMPO + TURNOVER SECONDARY WO",
        "B": "TEMPO + TURNOVER SECONDARY WO",
        "C": "TEMPO + TURNOVER SECONDARY WO",
        "PR": "FUEL + DAY 2 LIFT + CORE & HIP"
      },
      {
        "A": "50-60' EZ",
        "B": "40-50' EZ",
        "C": "30-40' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "90-100' EZ",
        "B": "80-90' EZ",
        "C": "65-75' EZ",
        "PR": "FUEL + TRAINING RECAP"
      }
    ]
  },
  {
    "phase": 4,
    "week": 20,
    "theme": "BASE (NO DOUBLES)",
    "start": "2026-10-19",
    "days": [
      {
        "A": "OFF",
        "B": "OFF",
        "C": "OFF",
        "PR": "NONE"
      },
      {
        "A": "70-80' EZ + 6-8 X 20\" STRIDES @ MILE",
        "B": "55-65' EZ + 6-8 X 20\" STRIDES @ MILE",
        "C": "40-50' EZ + 6-8 X 20\" STRIDES @ MILE",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "8K/6K WO #2",
        "B": "8K/6K WO #2",
        "C": "8K/6K WO #2",
        "PR": "FUEL + DAY 1 LIFT + CORE & HIP"
      },
      {
        "A": "50-60' EZ",
        "B": "40-50' EZ",
        "C": "30-40' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "PRE-MEET EI",
        "B": "PRE-MEET EI",
        "C": "PRE-MEET EI",
        "PR": "FUEL + DAY 2 LIFT + CORE & HIP"
      },
      {
        "A": "NAIA BLAZING TIGER",
        "B": "NAIA BLAZING TIGER",
        "C": "NAIA BLAZING TIGER",
        "PR": "FUEL"
      },
      {
        "A": "OFF",
        "B": "OFF",
        "C": "OFF",
        "PR": "TRAINING RECAP"
      }
    ]
  },
  {
    "phase": 4,
    "week": 21,
    "theme": "BASE (NO DOUBLES)",
    "start": "2026-10-26",
    "days": [
      {
        "A": "90-100' EZ",
        "B": "80-90' EZ",
        "C": "65-75' EZ",
        "PR": "FUEL"
      },
      {
        "A": "50-60' EZ",
        "B": "40-50' EZ",
        "C": "30-40' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "8K/6K WO #3",
        "B": "8K/6K WO #3",
        "C": "8K/6K WO #3",
        "PR": "FUEL + DAY 1 LIFT + CORE & HIP"
      },
      {
        "A": "50-60' EZ",
        "B": "40-50' EZ",
        "C": "30-40' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "TEMPO + TURNOVER SECONDARY WO",
        "B": "TEMPO + TURNOVER SECONDARY WO",
        "C": "TEMPO + TURNOVER SECONDARY WO",
        "PR": "FUEL + DAY 2 LIFT + CORE & HIP"
      },
      {
        "A": "50-60' EZ",
        "B": "40-50' EZ",
        "C": "30-40' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "70-80' EZ",
        "B": "60-70' EZ",
        "C": "50-60' EZ",
        "PR": "FUEL + TRAINING RECAP"
      }
    ]
  },
  {
    "phase": 4,
    "week": 22,
    "theme": "BASE (NO DOUBLES)",
    "start": "2026-11-02",
    "days": [
      {
        "A": "OFF",
        "B": "OFF",
        "C": "OFF",
        "PR": "NONE"
      },
      {
        "A": "60-70' EZ + 6-8 X 20\" STRIDES @ MILE",
        "B": "45-55' EZ + 6-8 X 20\" STRIDES @ MILE",
        "C": "35-45' EZ + 6-8 X 20\" STRIDES @ MILE",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "3X4X40\"/80\"/3' EI @ 3K-5K",
        "B": "3X4X40\"/80\"/3' EI @ 3K-5K",
        "C": "3X4X40\"/80\"/3' EI @ 3K-5K",
        "PR": "FUEL + DAY 1 LIFT + CORE & HIP"
      },
      {
        "A": "40-50' EZ",
        "B": "30-40' EZ",
        "C": "25-35' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "PRE-MEET EI",
        "B": "PRE-MEET EI",
        "C": "PRE-MEET EI",
        "PR": "FUEL + DAY 2 LIFT + CORE & HIP"
      },
      {
        "A": "SUN CONF. CHAMP.",
        "B": "SUN CONF. CHAMP.",
        "C": "SUN CONF. CHAMP.",
        "PR": "FUEL"
      },
      {
        "A": "OFF",
        "B": "OFF",
        "C": "OFF",
        "PR": "TRAINING RECAP"
      }
    ]
  },
  {
    "phase": 4,
    "week": 23,
    "theme": "BASE (NO DOUBLES)",
    "start": "2026-11-09",
    "days": [
      {
        "A": "90-100' EZ",
        "B": "80-90' EZ",
        "C": "65-75' EZ",
        "PR": "FUEL"
      },
      {
        "A": "50-60' EZ",
        "B": "40-50' EZ",
        "C": "30-40' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "8K/6K WO #4",
        "B": "8K/6K WO #4",
        "C": "8K/6K WO #4",
        "PR": "FUEL + DAY 1 LIFT + CORE & HIP"
      },
      {
        "A": "50-60' EZ",
        "B": "40-50' EZ",
        "C": "30-40' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "TEMPO + TURNOVER SECONDARY WO",
        "B": "TEMPO + TURNOVER SECONDARY WO",
        "C": "TEMPO + TURNOVER SECONDARY WO",
        "PR": "FUEL + DAY 2 LIFT + CORE & HIP"
      },
      {
        "A": "OFF",
        "B": "OFF",
        "C": "OFF",
        "PR": "NONE"
      },
      {
        "A": "70-80' EZ",
        "B": "60-70' EZ",
        "C": "50-60' EZ",
        "PR": "FUEL + TRAINING RECAP"
      }
    ]
  },
  {
    "phase": 4,
    "week": 24,
    "theme": "BASE (NO DOUBLES)",
    "start": "2026-11-16",
    "days": [
      {
        "A": "40-50' EZ",
        "B": "30-40' EZ",
        "C": "25-35' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "3X4X40\"/80\"/3' EI @ 3K-5K",
        "B": "3X4X40\"/80\"/3' EI @ 3K-5K",
        "C": "3X4X40\"/80\"/3' EI @ 3K-5K",
        "PR": "FUEL + DAY 1 LIFT + CORE & HIP"
      },
      {
        "A": "40-50' EZ",
        "B": "30-40' EZ",
        "C": "25-35' EZ",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "PRE-MEET EI",
        "B": "PRE-MEET EI",
        "C": "PRE-MEET EI",
        "PR": "FUEL + DAY 2 LIFT + CORE & HIP"
      },
      {
        "A": "NAIA NATIONAL CHAMP.",
        "B": "NAIA NATIONAL CHAMP.",
        "C": "NAIA NATIONAL CHAMP.",
        "PR": "FUEL + LIGHT STRETCH"
      },
      {
        "A": "OFF",
        "B": "OFF",
        "C": "OFF",
        "PR": "NONE"
      },
      {
        "A": "OFF",
        "B": "OFF",
        "C": "OFF",
        "PR": "TRAINING RECAP"
      }
    ]
  }
];
