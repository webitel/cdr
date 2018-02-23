package logger

import (
	"os"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

func Fatal(message string, args ...interface{}) {
	log.Fatal().Msgf(message, args...)
}

func Error(message string, args ...interface{}) {
	log.Error().Msgf(message, args...)
}

func ErrorElastic(message, id, errType, index, reason string) {
	log.Error().Str("Reason", reason).Str("Error type", errType).Str("Index", index).Str("Id", id).Msg(message)
}

func ErrorResponse(message string, code int, reason string) {
	log.Error().Str("Reason", reason).Int("Code", code).Msg(message)
}

func Warning(message string, args ...interface{}) {
	log.Warn().Msgf(message, args...)
}

func Info(message string, args ...interface{}) {
	log.Info().Msgf(message, args...)
}

func Debug(message string, args ...interface{}) {
	log.Debug().Msgf(message, args...)
}

func DebugElastic(message string, id, domain string) {
	log.Debug().Str("domain", domain).Str("uuid", id).Msg(message)
}

func Log(message string, args ...interface{}) {
	log.Log().Msgf(message, args...)
}

func SetLevel(level string) {
	if level == "error" {
		zerolog.SetGlobalLevel(zerolog.ErrorLevel)
	} else if level == "warn" {
		zerolog.SetGlobalLevel(zerolog.WarnLevel)
	} else if level == "info" {
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	} else {
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
	}
}

func init() {
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stdout})
	zerolog.TimeFieldFormat = "15:04:05 Mon 02/01/2006"
	zerolog.SetGlobalLevel(zerolog.InfoLevel)
}
