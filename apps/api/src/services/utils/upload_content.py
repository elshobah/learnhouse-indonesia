import logging
from typing import Literal, Optional
import boto3
from botocore.exceptions import ClientError
import os
from fastapi import HTTPException, UploadFile
from config.config import get_learnhouse_config
from src.security.file_validation import validate_upload

logger = logging.getLogger(__name__)


def get_file_url(
    directory: str,
    type_of_dir: str,
    uuid: str,
    filename: str,
) -> str:
    """
    Get the public URL for a file stored in S3/R2 or filesystem.

    Args:
        directory: Directory name (e.g., "logos", "avatars", "course-media")
        type_of_dir: "orgs" or "users"
        uuid: Organization or user UUID
        filename: The filename

    Returns:
        The public URL for the file
    """
    learnhouse_config = get_learnhouse_config()
    content_delivery = learnhouse_config.hosting_config.content_delivery.type

    relative_path = f"content/{type_of_dir}/{uuid}/{directory}/{filename}"

    if content_delivery == "filesystem":
        # Return relative filesystem path (served by the app)
        return f"/files/{relative_path}"
    elif content_delivery == "s3api":
        s3_config = learnhouse_config.hosting_config.content_delivery.s3api

        # If custom public domain is configured, use it; otherwise use endpoint URL
        if s3_config.public_url_domain:
            return f"{s3_config.public_url_domain}/{relative_path}"
        else:
            # Fallback to endpoint URL + key
            return f"{s3_config.endpoint_url}/{s3_config.bucket_name or 'learnhouse-media'}/{relative_path}"

    return relative_path


def ensure_directory_exists(directory: str):
    if not os.path.exists(directory):
        os.makedirs(directory)


async def upload_file(
    file: UploadFile,
    directory: str,
    type_of_dir: Literal["orgs", "users"],
    uuid: str,
    allowed_types: list[str],
    filename_prefix: str,
    max_size: Optional[int] = None,
) -> str:
    """
    Secure file upload with validation.
    
    Args:
        file: The uploaded file
        directory: Target directory (e.g., "logos", "avatars")
        type_of_dir: "orgs" or "users"
        uuid: Organization or user UUID
        allowed_types: List of allowed file types ('image', 'video', 'document')
        filename_prefix: Prefix for the generated filename
        max_size: Maximum file size in bytes (optional)
        
    Returns:
        The saved filename
    """
    from uuid import uuid4
    from src.security.file_validation import get_safe_filename
    
    # Validate the file
    _, content = validate_upload(file, allowed_types, max_size)
    
    # Generate safe filename
    filename = get_safe_filename(file.filename, f"{uuid4()}_{filename_prefix}")
    
    # Save the file
    await upload_content(
        directory=directory,
        type_of_dir=type_of_dir,
        uuid=uuid,
        file_binary=content,
        file_and_format=filename,
        allowed_formats=None,  # Already validated
    )
    
    return filename


async def upload_content(
    directory: str,
    type_of_dir: Literal["orgs", "users"],
    uuid: str,  # org_uuid or user_uuid
    file_binary: bytes,
    file_and_format: str,
    allowed_formats: Optional[list[str]] = None,
):
    # Get Learnhouse Config
    learnhouse_config = get_learnhouse_config()

    file_format = file_and_format.split(".")[-1].strip().lower()

    # Get content delivery method
    content_delivery = learnhouse_config.hosting_config.content_delivery.type

    # Check if format file is allowed
    if allowed_formats:
        if file_format not in allowed_formats:
            raise HTTPException(
                status_code=400,
                detail=f"File format {file_format} not allowed",
            )

    ensure_directory_exists(f"content/{type_of_dir}/{uuid}/{directory}")

    if content_delivery == "filesystem":
        # upload file to server
        with open(
            f"content/{type_of_dir}/{uuid}/{directory}/{file_and_format}",
            "wb",
        ) as f:
            f.write(file_binary)
            f.close()

    elif content_delivery == "s3api":
        s3_config = learnhouse_config.hosting_config.content_delivery.s3api

        # Validate required S3 configuration
        if not s3_config.endpoint_url:
            raise HTTPException(status_code=500, detail="S3 endpoint URL is not configured")
        if not s3_config.access_key_id or not s3_config.secret_access_key:
            raise HTTPException(status_code=500, detail="S3 credentials are not configured")

        # Create S3 client with credentials
        s3 = boto3.client(
            "s3",
            endpoint_url=s3_config.endpoint_url,
            aws_access_key_id=s3_config.access_key_id,
            aws_secret_access_key=s3_config.secret_access_key,
            region_name="auto",  # For Cloudflare R2
        )

        bucket_name = s3_config.bucket_name or "learnhouse-media"
        local_path = f"content/{type_of_dir}/{uuid}/{directory}/{file_and_format}"
        s3_key = local_path

        # Write to local temp file for S3 upload
        with open(local_path, "wb") as f:
            f.write(file_binary)

        try:
            s3.upload_file(local_path, bucket_name, s3_key)
            s3.head_object(Bucket=bucket_name, Key=s3_key)
            logger.debug("S3 upload successful: %s", s3_key)
        except ClientError as e:
            logger.error("S3 upload failed: %s", e)
            raise HTTPException(status_code=500, detail="File upload to storage failed")
        finally:
            # Clean up local temp file after S3 upload
            try:
                os.remove(local_path)
            except OSError:
                pass
