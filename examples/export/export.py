"""Write the selected names as a one-column CSV file."""

import csv
import sys


def main(names):
    writer = csv.writer(sys.stdout, lineterminator="\n")
    writer.writerow(["name"])
    for name in sorted(names):
        writer.writerow([name])


if __name__ == "__main__":
    main(sys.argv[1:])
