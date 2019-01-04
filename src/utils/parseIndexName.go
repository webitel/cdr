package utils

import (
	"fmt"
	"regexp"
	"strings"
	"time"
)

var regCompileVar *regexp.Regexp

func init() {
	regCompileVar = regexp.MustCompile(`\$\{([\s\S]*?)\}`)
}

func pad(i int) string {
	return fmt.Sprintf("%02d", i)
}

// "${INDEX}-${LEG}-${YEAR}-${MONTH}-${DAY}-${DOMAIN}"
func GetIndexName(template, index, domain, leg string, startEpoch int64) string {
	t := time.Unix(startEpoch, 0).UTC()
	return strings.ToLower(regCompileVar.ReplaceAllStringFunc(template, func(s string) string {
		switch s {
		case "${INDEX}":
			return index
		case "${LEG}":
			return leg
		case "${YEAR}":
			return fmt.Sprintf("%d", t.Year())
		case "${MONTH}":
			return pad(int(t.Month()))
		case "${WEEK}":
			_, w := t.ISOWeek()
			return pad(w)
		case "${DAY}":
			return pad(t.Day())
		case "${DOMAIN}":
			return domain
		}
		return ""
	}))
}
