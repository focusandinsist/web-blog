from io import StringIO

from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Validate the backend article source without writing database rows."

    def add_arguments(self, parser):
        parser.add_argument("--source", help="Article source directory relative to backend/.")

    def handle(self, *args, **options):
        command_args = []
        if options["source"]:
            command_args.extend(["--source", options["source"]])
        output = StringIO()
        try:
            call_command("import_publication", *command_args, stdout=output)
        except CommandError as error:
            self.stdout.write(output.getvalue(), ending="")
            raise error
        self.stdout.write(output.getvalue(), ending="")
        self.stdout.write("Content integrity check passed.\n")
